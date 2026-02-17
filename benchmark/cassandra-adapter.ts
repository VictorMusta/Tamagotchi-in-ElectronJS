// --- Cassandra Adapter ---
import { Client, types } from 'cassandra-driver';
import { DbAdapter, PotatoDoc, MatchDoc } from './types';

const KEYSPACE = 'potato_benchmark';

export class CassandraAdapter implements DbAdapter {
  private client: Client;

  constructor() {
    this.client = new Client({
      contactPoints: ['localhost:9042'],
      localDataCenter: 'dc1',
      socketOptions: {
        readTimeout: 60000,
        connectTimeout: 10000
      },
      queryOptions: {
        prepare: true,
        fetchSize: 1000
      }
    });
  }

  async connect(): Promise<void> {
    await this.client.connect();
    await this.client.execute(`
      CREATE KEYSPACE IF NOT EXISTS ${KEYSPACE}
      WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}
    `);
    await this.client.execute(`USE ${KEYSPACE}`);

    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS potatoes (
        id text PRIMARY KEY,
        name text,
        force int,
        vitesse int,
        agilite int,
        vitalite int,
        level int,
        traits list<text>,
        weapons list<text>,
        total_stats int
      )
    `);

    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS matches (
        id_p1 text, id_p2 text, winner_id text,
        PRIMARY KEY ((id_p1), id_p2)
      )
    `);

    try {
      await this.client.execute(`
        CREATE TABLE IF NOT EXISTS wins_by_potato (
          winner_id text, id_p1 text, id_p2 text,
          PRIMARY KEY ((winner_id), id_p1, id_p2)
        )
      `);
    } catch { }

    console.log('[Cassandra] Connected');
  }

  async disconnect(): Promise<void> {
    await this.client.shutdown();
  }

  async insertPotatoes(potatoes: PotatoDoc[]): Promise<void> {
    const query = `INSERT INTO potatoes (id, name, force, vitesse, agilite, vitalite, level, traits, weapons, total_stats) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const queries = potatoes.map((p) => ({
      query,
      params: [p.id, p.name, p.force, p.vitesse, p.agilite, p.vitalite, p.level, p.traits, p.weapons, p.totalStats],
    }));
    const BATCH = 50;
    for (let i = 0; i < queries.length; i += BATCH) {
      await this.client.batch(queries.slice(i, i + BATCH), { prepare: true });
    }
  }

  async insertMatchesBulk(matches: MatchDoc[]): Promise<void> {
    const matchQuery = `INSERT INTO matches (id_p1, id_p2, winner_id) VALUES (?, ?, ?)`;
    const winsQuery = `INSERT INTO wins_by_potato (winner_id, id_p1, id_p2) VALUES (?, ?, ?)`;
    const BATCH = 10;
    for (let i = 0; i < matches.length; i += BATCH) {
      const chunk = matches.slice(i, i + BATCH);
      const batchQueries = chunk.flatMap((m) => [
        { query: matchQuery, params: [m.id_p1, m.id_p2, m.winner_id] },
        { query: winsQuery, params: [m.winner_id, m.id_p1, m.id_p2] },
      ]);
      await this.client.batch(batchQueries, { prepare: true, logged: false });
    }
  }

  async getTopWinrate(limit: number): Promise<unknown[]> {
    const allPotatoes = await this.client.execute(`SELECT id FROM potatoes`);
    const results: { id: string; wins: number }[] = [];
    for (const row of allPotatoes.rows) {
      const countResult = await this.client.execute(
        `SELECT COUNT(*) as cnt FROM wins_by_potato WHERE winner_id = ?`,
        [row.id], { prepare: true }
      );
      results.push({ id: row.id, wins: Number(countResult.rows[0].cnt) });
    }
    results.sort((a, b) => b.wins - a.wins);
    return results.slice(0, limit);
  }

  async getOnePotato(id: string): Promise<unknown> {
    const result = await this.client.execute(`SELECT * FROM potatoes WHERE id = ?`, [id], { prepare: true });
    return result.rows[0] || null;
  }

  async updatePotatoTrait(id: string, newTrait: string): Promise<void> {
    await this.client.execute(`UPDATE potatoes SET traits = traits + ? WHERE id = ?`, [[newTrait], id], { prepare: true });
  }

  async deletePotato(id: string): Promise<void> {
    await this.client.execute(`DELETE FROM potatoes WHERE id = ?`, [id], { prepare: true });
    await this.client.execute(`DELETE FROM matches WHERE id_p1 = ?`, [id], { prepare: true });
    await this.client.execute(`DELETE FROM wins_by_potato WHERE winner_id = ?`, [id], { prepare: true });
  }

  async clearAll(): Promise<void> {
    await this.client.execute(`TRUNCATE potatoes`);
    await this.client.execute(`TRUNCATE matches`);
    await this.client.execute(`TRUNCATE wins_by_potato`);
  }

  async createIndexes(): Promise<void> {
    try { await this.client.execute(`CREATE INDEX IF NOT EXISTS ON matches (winner_id)`); } catch { }
    try { await this.client.execute(`CREATE INDEX IF NOT EXISTS ON potatoes (force)`); } catch { }
  }

  async dropIndexes(): Promise<void> {
    try { await this.client.execute(`DROP INDEX IF EXISTS ${KEYSPACE}.matches_winner_id_idx`); } catch { }
    try { await this.client.execute(`DROP INDEX IF EXISTS ${KEYSPACE}.potatoes_force_idx`); } catch { }
  }

  // --- Analytical queries (Cassandra has limited aggregation) ---

  async avgStats(): Promise<unknown> {
    // Cassandra supports AVG natively since 2.2+
    const result = await this.client.execute(
      `SELECT AVG(force) as avg_force, AVG(vitesse) as avg_vitesse, AVG(agilite) as avg_agilite, AVG(vitalite) as avg_vitalite FROM potatoes`
    );
    const row = result.rows[0];
    return { avgForce: Number(row.avg_force), avgVitesse: Number(row.avg_vitesse), avgAgilite: Number(row.avg_agilite), avgVitalite: Number(row.avg_vitalite) };
  }

  async sumTotalStats(): Promise<unknown> {
    const result = await this.client.execute(`SELECT SUM(total_stats) as total FROM potatoes`);
    return { total: Number(result.rows[0].total) };
  }

  async countWhere(minForce: number): Promise<number> {
    // Cassandra doesn't support > without ALLOW FILTERING
    const result = await this.client.execute(
      `SELECT COUNT(*) as cnt FROM potatoes WHERE force >= ? ALLOW FILTERING`,
      [minForce], { prepare: true }
    );
    return Number(result.rows[0].cnt);
  }

  async selectWhere(minForce: number, limit: number): Promise<unknown[]> {
    const result = await this.client.execute(
      `SELECT * FROM potatoes WHERE force >= ? LIMIT ? ALLOW FILTERING`,
      [minForce, limit], { prepare: true }
    );
    return result.rows;
  }

  async groupByTraitCount(): Promise<unknown[]> {
    // Cassandra has no GROUP BY on computed fields, must scan client-side
    const result = await this.client.execute(`SELECT traits, total_stats FROM potatoes`);
    const groups: Record<number, { sum: number; count: number }> = {};
    for (const row of result.rows) {
      const numTraits = (row.traits || []).length;
      if (!groups[numTraits]) groups[numTraits] = { sum: 0, count: 0 };
      groups[numTraits].sum += Number(row.total_stats);
      groups[numTraits].count++;
    }
    return Object.entries(groups)
      .map(([k, v]) => ({ numTraits: parseInt(k), avgTotalStats: v.sum / v.count, count: v.count }))
      .sort((a, b) => a.numTraits - b.numTraits);
  }

  async minMaxStats(): Promise<unknown> {
    const result = await this.client.execute(
      `SELECT MIN(force) as min_f, MAX(force) as max_f, MIN(vitesse) as min_v, MAX(vitesse) as max_v,
              MIN(agilite) as min_a, MAX(agilite) as max_a, MIN(vitalite) as min_vi, MAX(vitalite) as max_vi FROM potatoes`
    );
    const r = result.rows[0];
    return {
      minForce: Number(r.min_f), maxForce: Number(r.max_f),
      minVitesse: Number(r.min_v), maxVitesse: Number(r.max_v),
      minAgilite: Number(r.min_a), maxAgilite: Number(r.max_a),
      minVitalite: Number(r.min_vi), maxVitalite: Number(r.max_vi),
    };
  }
}
