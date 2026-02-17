// --- Redis Adapter ---
import Redis from 'ioredis';
import { DbAdapter, PotatoDoc, MatchDoc } from './types';

export class RedisAdapter implements DbAdapter {
  private client!: Redis;

  async connect(): Promise<void> {
    this.client = new Redis({ host: 'localhost', port: 6379, lazyConnect: true });
    await this.client.connect();
    console.log('[Redis] Connected');
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }

  async insertPotatoes(potatoes: PotatoDoc[]): Promise<void> {
    const pipeline = this.client.pipeline();
    for (const p of potatoes) {
      pipeline.hset(`potato:${p.id}`, {
        id: p.id, name: p.name,
        force: p.force.toString(), vitesse: p.vitesse.toString(),
        agilite: p.agilite.toString(), vitalite: p.vitalite.toString(),
        level: p.level.toString(),
        traits: JSON.stringify(p.traits), weapons: JSON.stringify(p.weapons),
        totalStats: p.totalStats.toString(),
        numTraits: p.traits.length.toString(),
      });
      pipeline.sadd('potato_ids', p.id);
    }
    await pipeline.exec();
  }

  async insertMatchesBulk(matches: MatchDoc[]): Promise<void> {
    // Insert match references in batches using pipelines
    const BATCH = 10000;
    for (let i = 0; i < matches.length; i += BATCH) {
      const pipeline = this.client.pipeline();
      const chunk = matches.slice(i, i + BATCH);
      for (const m of chunk) {
        // Increment wins and game counters directly in Redis
        pipeline.hincrby(`potato:${m.winner_id}`, 'wins', 1);
        pipeline.hincrby(`potato:${m.id_p1}`, 'totalGames', 1);
        pipeline.hincrby(`potato:${m.id_p2}`, 'totalGames', 1);
      }
      await pipeline.exec();
    }

    // Build leaderboard from the incremented counters
    const ids = await this.client.smembers('potato_ids');
    const lbPipeline = this.client.pipeline();
    for (const id of ids) {
      lbPipeline.hgetall(`potato:${id}`);
    }
    const allData = await lbPipeline.exec();
    const scorePipeline = this.client.pipeline();
    for (let i = 0; i < ids.length; i++) {
      const data = (allData as any)?.[i]?.[1] as Record<string, string> | null;
      if (!data) continue;
      const wins = parseInt(data.wins || '0');
      const total = parseInt(data.totalGames || '1') || 1;
      const winrate = (wins / total) * 100;
      scorePipeline.zadd('leaderboard', winrate, ids[i]);
      scorePipeline.hset(`potato:${ids[i]}`, 'winrate', winrate.toFixed(2));
    }
    await scorePipeline.exec();
  }

  async getTopWinrate(limit: number): Promise<unknown[]> {
    const topIds = await this.client.zrevrange('leaderboard', 0, limit - 1, 'WITHSCORES');
    const results: unknown[] = [];
    for (let i = 0; i < topIds.length; i += 2) {
      const id = topIds[i];
      const score = topIds[i + 1];
      const data = await this.client.hgetall(`potato:${id}`);
      results.push({ id, winrate: score, ...data });
    }
    return results;
  }

  async getOnePotato(id: string): Promise<unknown> {
    return this.client.hgetall(`potato:${id}`);
  }

  async updatePotatoTrait(id: string, newTrait: string): Promise<void> {
    const raw = await this.client.hget(`potato:${id}`, 'traits');
    const traits: string[] = raw ? JSON.parse(raw) : [];
    traits.push(newTrait);
    await this.client.hset(`potato:${id}`, 'traits', JSON.stringify(traits));
  }

  async deletePotato(id: string): Promise<void> {
    await this.client.del(`potato:${id}`);
    await this.client.del(`matches:${id}`);
    await this.client.zrem('leaderboard', id);
    await this.client.srem('potato_ids', id);
  }

  async clearAll(): Promise<void> {
    await this.client.flushdb();
  }

  async createIndexes(): Promise<void> { }
  async dropIndexes(): Promise<void> { }

  // --- Analytical queries (must scan all keys — Redis has no native aggregation) ---

  private async getAllPotatoData(): Promise<Record<string, string>[]> {
    const ids = await this.client.smembers('potato_ids');
    const pipeline = this.client.pipeline();
    for (const id of ids) { pipeline.hgetall(`potato:${id}`); }
    const results = await pipeline.exec();
    return (results || []).map(([, data]) => data as Record<string, string>);
  }

  async avgStats(): Promise<unknown> {
    const all = await this.getAllPotatoData();
    const n = all.length || 1;
    let sF = 0, sV = 0, sA = 0, sVi = 0;
    for (const p of all) {
      sF += parseInt(p.force) || 0;
      sV += parseInt(p.vitesse) || 0;
      sA += parseInt(p.agilite) || 0;
      sVi += parseInt(p.vitalite) || 0;
    }
    return { avgForce: sF / n, avgVitesse: sV / n, avgAgilite: sA / n, avgVitalite: sVi / n };
  }

  async sumTotalStats(): Promise<unknown> {
    const all = await this.getAllPotatoData();
    let total = 0;
    for (const p of all) { total += parseInt(p.totalStats) || 0; }
    return { total };
  }

  async countWhere(minForce: number): Promise<number> {
    const all = await this.getAllPotatoData();
    return all.filter(p => (parseInt(p.force) || 0) >= minForce).length;
  }

  async selectWhere(minForce: number, limit: number): Promise<unknown[]> {
    const all = await this.getAllPotatoData();
    return all
      .filter(p => (parseInt(p.force) || 0) >= minForce)
      .sort((a, b) => (parseInt(b.force) || 0) - (parseInt(a.force) || 0))
      .slice(0, limit);
  }

  async groupByTraitCount(): Promise<unknown[]> {
    const all = await this.getAllPotatoData();
    const groups: Record<number, { sum: number; count: number }> = {};
    for (const p of all) {
      const numTraits = parseInt(p.numTraits) || 0;
      if (!groups[numTraits]) groups[numTraits] = { sum: 0, count: 0 };
      groups[numTraits].sum += parseInt(p.totalStats) || 0;
      groups[numTraits].count++;
    }
    return Object.entries(groups)
      .map(([k, v]) => ({ numTraits: parseInt(k), avgTotalStats: v.sum / v.count, count: v.count }))
      .sort((a, b) => a.numTraits - b.numTraits);
  }

  async minMaxStats(): Promise<unknown> {
    const all = await this.getAllPotatoData();
    let minF = Infinity, maxF = -Infinity, minV = Infinity, maxV = -Infinity;
    let minA = Infinity, maxA = -Infinity, minVi = Infinity, maxVi = -Infinity;
    for (const p of all) {
      const f = parseInt(p.force) || 0, v = parseInt(p.vitesse) || 0;
      const a = parseInt(p.agilite) || 0, vi = parseInt(p.vitalite) || 0;
      if (f < minF) minF = f; if (f > maxF) maxF = f;
      if (v < minV) minV = v; if (v > maxV) maxV = v;
      if (a < minA) minA = a; if (a > maxA) maxA = a;
      if (vi < minVi) minVi = vi; if (vi > maxVi) maxVi = vi;
    }
    return { minForce: minF, maxForce: maxF, minVitesse: minV, maxVitesse: maxV, minAgilite: minA, maxAgilite: maxA, minVitalite: minVi, maxVitalite: maxVi };
  }
}
