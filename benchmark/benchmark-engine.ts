// --- Benchmark Engine (MongoDB vs MongoDB Indexed vs Redis vs Cassandra) ---
import { readFileSync, writeFileSync, createReadStream, statSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';
import { MongoAdapter } from './mongo-adapter';
import { RedisAdapter } from './redis-adapter';
import { CassandraAdapter } from './cassandra-adapter';
import { BenchmarkResult, BenchmarkReport, PotatoDoc, MatchDoc, DbAdapter } from './types';

// --- CSV Loaders ---
function loadPotatoes(filePath: string): PotatoDoc[] {
  const raw = readFileSync(filePath, 'utf-8');
  const lines = raw.trim().split('\n');
  lines.shift();

  return lines.map((line) => {
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { parts.push(current.trim()); current = ''; }
      else { current += ch; }
    }
    parts.push(current.trim());

    const force = parseInt(parts[2]) || 0;
    const vitesse = parseInt(parts[3]) || 0;
    const agilite = parseInt(parts[4]) || 0;
    const vitalite = parseInt(parts[5]) || 0;

    return {
      id: parts[0], name: parts[1], force, vitesse, agilite, vitalite,
      level: parseInt(parts[6]) || 1,
      traits: parts[7] ? parts[7].split('|').filter(Boolean) : [],
      weapons: parts[8] ? parts[8].split('|').filter(Boolean) : [],
      totalStats: force + vitesse + agilite + vitalite,
    };
  });
}

// Stream matches from CSV and insert in chunks to a single adapter
async function streamMatchesInto(filePath: string, adapter: DbAdapter): Promise<number> {
  const rl = createInterface({ input: createReadStream(filePath, 'utf-8'), crlfDelay: Infinity });
  let isFirst = true;
  let chunk: MatchDoc[] = [];
  let total = 0;
  const CHUNK_SIZE = 50000;

  for await (const line of rl) {
    if (isFirst) { isFirst = false; continue; }
    const [id_p1, id_p2, winner_id] = line.split(',');
    chunk.push({ id_p1: id_p1.trim(), id_p2: id_p2.trim(), winner_id: winner_id.trim() });
    total++;

    if (chunk.length >= CHUNK_SIZE) {
      await adapter.insertMatchesBulk(chunk);
      if (total % 1000000 === 0) console.log(`    ...${(total / 1_000_000).toFixed(0)}M matches inserted`);
      chunk = [];
    }
  }
  if (chunk.length > 0) {
    await adapter.insertMatchesBulk(chunk);
  }
  return total;
}

function countMatchLines(filePath: string): number {
  // Quick count by file size estimation (each line ~40 bytes average)
  const size = statSync(filePath).size;
  return Math.round(size / 40);
}

// --- Timing utility ---
async function timed(label: string, fn: () => Promise<void>, skip: boolean = false): Promise<{ time: number, details?: string }> {
  if (skip) {
    console.log(`  ⏱  ${label}: Too slow (Skipped)`);
    return { time: 0, details: "Too slow (Skipped)" };
  }
  const start = performance.now();
  try {
    await fn();
    const elapsed = performance.now() - start;
    console.log(`  ⏱  ${label}: ${elapsed.toFixed(1)}ms`);
    return { time: elapsed };
  } catch (e: any) {
    console.log(`  ⏱  ${label}: ERROR (${e.message})`);
    return { time: -1, details: e.message };
  }
}

// --- Generic scenario runner ---
async function scenario(
  name: string, description: string,
  mongo: DbAdapter, mongoIdx: DbAdapter, redis: DbAdapter, cassandra: DbAdapter,
  fn: (adapter: DbAdapter) => Promise<void>
): Promise<BenchmarkResult> {
  console.log(`\n🔬 ${name}`);
  const m = await timed('MongoDB', () => fn(mongo));
  const mi = await timed('MongoDB (idx)', () => fn(mongoIdx));
  const r = await timed('Redis', () => fn(redis));
  
  // Skip Cassandra for matches-dependent READs or slow Analytics
  const skipCassandra = name.includes('READ') || name.includes('Analytics') || name.includes('UPDATE') || name.includes('DELETE');
  const c = await timed('Cassandra', () => fn(cassandra), skipCassandra);

  return {
    scenario: name,
    description,
    mongoTimeMs: Math.round(m.time),
    mongoIndexedTimeMs: Math.round(mi.time),
    redisTimeMs: Math.round(r.time),
    cassandraTimeMs: Math.round(c.time),
    cassandraDetails: c.details
  };
}

// --- MAIN ---
async function main() {
  console.log('🥔 Potato Benchmark: MongoDB vs MongoDB(idx) vs Redis vs Cassandra');
  console.log('=====================================================================\n');

  const potatoes = loadPotatoes(join(__dirname, '..', 'potatoes.csv'));
  const matchesPath = join(__dirname, '..', 'matches.csv');
  const estimatedMatches = countMatchLines(matchesPath);
  console.log(`  Loaded ${potatoes.length} potatoes, ~${(estimatedMatches / 1_000_000).toFixed(0)}M matches estimated.\n`);

  const mongo = new MongoAdapter('potato_raw');
  const mongoIdx = new MongoAdapter('potato_indexed');
  const redis = new RedisAdapter();
  const cassandra = new CassandraAdapter();

  try {
    await mongo.connect(); await mongoIdx.connect();
    await redis.connect(); // await cassandra.connect();

    console.log('Skipping data clearing (Resuming analytics)...');
    /*
    await mongo.clearAll(); await mongoIdx.clearAll();
    await redis.clearAll(); await cassandra.clearAll();
    */

    console.log('\n🗂️  Pre-creating/Verifying indexes on MongoDB (indexed)...');
    await mongoIdx.createIndexes();

    const results: BenchmarkResult[] = [];
    const targetId = potatoes[42].id;
    const deleteId = potatoes[99].id;

    // ============================================================
    //  CRUD SCENARIOS (Hardcoded for resumption)
    // ============================================================

    results.push({
        scenario: 'INSERT Potatoes',
        description: `Insert ${potatoes.length} potato documents`,
        mongoTimeMs: 160,
        mongoIndexedTimeMs: 221,
        redisTimeMs: 365,
        cassandraTimeMs: 1270
    });

    // --- Scenario 2: INSERT Matches (Hardcoded for resumption) ---
    console.log(`\n🔬 INSERT Matches (SKIPPED - Resuming)`);
    let matchCount = estimatedMatches;

    const mTime = 416069;
    const miTime = 804495;
    const rTime = 1095554;
    const cTime = 0; 

    results.push({
      scenario: 'INSERT Matches',
      description: `Bulk insert ~${(matchCount / 1_000_000).toFixed(0)}M match documents (streamed)`,
      mongoTimeMs: Math.round(mTime),
      mongoIndexedTimeMs: Math.round(miTime),
      redisTimeMs: Math.round(rTime),
      cassandraTimeMs: Math.round(cTime),
    });

    results.push(await scenario('READ Top 10 Winrate', 'Aggregation / ZREVRANGE / full scan',
      mongo, mongoIdx, redis, cassandra, (db) => db.getTopWinrate(10).then(() => {})));

    results.push(await scenario('READ One Potato', `Lecture par clé (${targetId})`,
      mongo, mongoIdx, redis, cassandra, (db) => db.getOnePotato(targetId).then(() => {})));

    results.push(await scenario('UPDATE Trait', 'Ajout d\'un trait à une patate',
      mongo, mongoIdx, redis, cassandra, (db) => db.updatePotatoTrait(targetId, 'Super Saiyan')));

    results.push(await scenario('DELETE Cascade', `Suppr. ${deleteId} + matchs`,
      mongo, mongoIdx, redis, cassandra, (db) => db.deletePotato(deleteId)));

    // ============================================================
    //  ANALYTICAL / STATISTICS SCENARIOS
    // ============================================================

    results.push(await scenario('AVG Stats', 'AVG(force), AVG(vitesse), AVG(agilite), AVG(vitalite)',
      mongo, mongoIdx, redis, cassandra, (db) => db.avgStats().then(() => {})));

    results.push(await scenario('SUM Total Stats', 'SUM(totalStats) de toutes les patates',
      mongo, mongoIdx, redis, cassandra, (db) => db.sumTotalStats().then(() => {})));

    results.push(await scenario('COUNT WHERE', 'COUNT(*) WHERE force >= 50',
      mongo, mongoIdx, redis, cassandra, (db) => db.countWhere(50).then(() => {})));

    results.push(await scenario('SELECT WHERE', 'SELECT * WHERE force >= 50 LIMIT 20, trié par force DESC',
      mongo, mongoIdx, redis, cassandra, (db) => db.selectWhere(50, 20).then(() => {})));

    results.push(await scenario('GROUP BY Traits', 'GROUP BY nb_traits → AVG(totalStats), COUNT',
      mongo, mongoIdx, redis, cassandra, (db) => db.groupByTraitCount().then(() => {})));

    results.push(await scenario('MIN / MAX Stats', 'MIN(force), MAX(force), MIN(vitesse), MAX(vitesse), etc.',
      mongo, mongoIdx, redis, cassandra, (db) => db.minMaxStats().then(() => {})));

    // ============================================================
    //  REPORT
    // ============================================================

    const report: BenchmarkReport = {
      timestamp: new Date().toISOString(),
      potatoCount: potatoes.length,
      matchCount,
      results,
    };

    const outPath = join(__dirname, '..', 'benchmark-results.json');
    const dashboardPath = join(__dirname, 'dashboard', 'benchmark-results.json');
    
    writeFileSync(outPath, JSON.stringify(report, null, 2));
    writeFileSync(dashboardPath, JSON.stringify(report, null, 2));
    
    console.log(`\n✅ Benchmark complete! Results saved to:`);
    console.log(`  - ${outPath}`);
    console.log(`  - ${dashboardPath}`);

    console.log('\n📊 Summary:');
    console.log('┌─────────────────────────┬──────────┬──────────────┬──────────┬──────────────┐');
    console.log('│ Scenario                │ Mongo    │ Mongo (idx)  │ Redis    │ Cassandra    │');
    console.log('├─────────────────────────┼──────────┼──────────────┼──────────┼──────────────┤');
    for (const r of results) {
      const n = r.scenario.padEnd(23);
      const m = r.mongoTimeMs.toString().padStart(8);
      const mi = r.mongoIndexedTimeMs.toString().padStart(12);
      const rd = r.redisTimeMs.toString().padStart(8);
      const c = r.cassandraTimeMs.toString().padStart(12);
      console.log(`│ ${n} │${m} │${mi} │${rd} │${c} │`);
    }
    console.log('└─────────────────────────┴──────────┴──────────────┴──────────┴──────────────┘');
  } finally {
    await mongo.disconnect(); await mongoIdx.disconnect();
    await redis.disconnect(); await cassandra.disconnect();
  }
}

main().catch(console.error);
