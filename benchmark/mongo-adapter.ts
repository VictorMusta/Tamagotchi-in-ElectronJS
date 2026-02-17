// --- MongoDB Adapter ---
import { MongoClient, Db, Collection } from 'mongodb';
import { DbAdapter, PotatoDoc, MatchDoc } from './types';

const MONGO_URL = 'mongodb://localhost:27017';

export class MongoAdapter implements DbAdapter {
  private client: MongoClient;
  private db!: Db;
  private potatoes!: Collection<PotatoDoc>;
  private matches!: Collection<MatchDoc>;
  private dbName: string;

  constructor(dbName: string = 'potato_benchmark') {
    this.dbName = dbName;
    this.client = new MongoClient(MONGO_URL);
  }

  async connect(): Promise<void> {
    await this.client.connect();
    this.db = this.client.db(this.dbName);
    this.potatoes = this.db.collection('potatoes');
    this.matches = this.db.collection('matches');
    console.log(`[MongoDB:${this.dbName}] Connected`);
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  async insertPotatoes(potatoes: PotatoDoc[]): Promise<void> {
    await this.potatoes.insertMany(potatoes);
  }

  async insertMatchesBulk(matches: MatchDoc[]): Promise<void> {
    const BATCH = 10000;
    for (let i = 0; i < matches.length; i += BATCH) {
      const chunk = matches.slice(i, i + BATCH);
      await this.matches.insertMany(chunk, { ordered: false });
    }
  }

  async getTopWinrate(limit: number): Promise<unknown[]> {
    return this.matches.aggregate([
      { $group: { _id: '$winner_id', wins: { $sum: 1 } } },
      { $sort: { wins: -1 } },
      { $limit: limit },
      { $lookup: { from: 'potatoes', localField: '_id', foreignField: 'id', as: 'potato' } },
      { $unwind: '$potato' },
      { $project: { id: '$_id', name: '$potato.name', wins: 1, force: '$potato.force', vitesse: '$potato.vitesse' } },
    ]).toArray();
  }

  async getOnePotato(id: string): Promise<unknown> {
    return this.potatoes.findOne({ id });
  }

  async updatePotatoTrait(id: string, newTrait: string): Promise<void> {
    await this.potatoes.updateOne({ id }, { $push: { traits: newTrait } as any });
  }

  async deletePotato(id: string): Promise<void> {
    await this.potatoes.deleteOne({ id });
    await this.matches.deleteMany({ $or: [{ id_p1: id }, { id_p2: id }] });
  }

  async clearAll(): Promise<void> {
    try { await this.potatoes.drop(); } catch (e) {}
    try { await this.matches.drop(); } catch (e) {}
    // Re-initialize collection references after drop
    this.potatoes = this.db.collection<PotatoDoc>('potatoes');
    this.matches = this.db.collection<MatchDoc>('matches');
    await this.dropIndexes();
  }

  async createIndexes(): Promise<void> {
    await this.matches.createIndex({ winner_id: 1 });
    await this.matches.createIndex({ id_p1: 1, id_p2: 1 });
    await this.potatoes.createIndex({ id: 1 });
    await this.potatoes.createIndex({ force: 1 });
    await this.potatoes.createIndex({ totalStats: 1 });
  }

  async dropIndexes(): Promise<void> {
    try { await this.matches.dropIndexes(); await this.potatoes.dropIndexes(); } catch { }
  }

  // --- Analytical queries ---

  async avgStats(): Promise<unknown> {
    const result = await this.potatoes.aggregate([
      {
        $group: {
          _id: null,
          avgForce: { $avg: '$force' },
          avgVitesse: { $avg: '$vitesse' },
          avgAgilite: { $avg: '$agilite' },
          avgVitalite: { $avg: '$vitalite' },
        },
      },
    ]).toArray();
    return result[0];
  }

  async sumTotalStats(): Promise<unknown> {
    const result = await this.potatoes.aggregate([
      { $group: { _id: null, total: { $sum: '$totalStats' } } },
    ]).toArray();
    return result[0];
  }

  async countWhere(minForce: number): Promise<number> {
    return this.potatoes.countDocuments({ force: { $gte: minForce } });
  }

  async selectWhere(minForce: number, limit: number): Promise<unknown[]> {
    return this.potatoes.find({ force: { $gte: minForce } }).sort({ force: -1 }).limit(limit).toArray();
  }

  async groupByTraitCount(): Promise<unknown[]> {
    return this.potatoes.aggregate([
      { $addFields: { numTraits: { $size: '$traits' } } },
      { $group: { _id: '$numTraits', avgTotalStats: { $avg: '$totalStats' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).toArray();
  }

  async minMaxStats(): Promise<unknown> {
    const result = await this.potatoes.aggregate([
      {
        $group: {
          _id: null,
          minForce: { $min: '$force' }, maxForce: { $max: '$force' },
          minVitesse: { $min: '$vitesse' }, maxVitesse: { $max: '$vitesse' },
          minAgilite: { $min: '$agilite' }, maxAgilite: { $max: '$agilite' },
          minVitalite: { $min: '$vitalite' }, maxVitalite: { $max: '$vitalite' },
        },
      },
    ]).toArray();
    return result[0];
  }
}
