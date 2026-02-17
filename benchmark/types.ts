// --- Benchmark Types ---

export interface PotatoDoc {
  id: string;
  name: string;
  force: number;
  vitesse: number;
  agilite: number;
  vitalite: number;
  level: number;
  traits: string[];
  weapons: string[];
  totalStats: number;
}

export interface MatchDoc {
  id_p1: string;
  id_p2: string;
  winner_id: string;
}

export interface WinrateDoc extends PotatoDoc {
  wins: number;
  totalGames: number;
  winrate: number;
}

export interface BenchmarkResult {
  scenario: string;
  description: string;
  mongoTimeMs: number;
  mongoIndexedTimeMs: number;
  redisTimeMs: number;
  cassandraTimeMs: number;
  mongoDetails?: string;
  mongoIndexedDetails?: string;
  redisDetails?: string;
  cassandraDetails?: string;
}

export interface BenchmarkReport {
  timestamp: string;
  potatoCount: number;
  matchCount: number;
  results: BenchmarkResult[];
}

export interface DbAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  insertPotatoes(potatoes: PotatoDoc[]): Promise<void>;
  insertMatchesBulk(matches: MatchDoc[]): Promise<void>;
  getTopWinrate(limit: number): Promise<unknown[]>;
  getOnePotato(id: string): Promise<unknown>;
  updatePotatoTrait(id: string, newTrait: string): Promise<void>;
  deletePotato(id: string): Promise<void>;
  clearAll(): Promise<void>;
  createIndexes(): Promise<void>;
  dropIndexes(): Promise<void>;

  // --- Analytical queries ---
  avgStats(): Promise<unknown>;                          // AVG(force), AVG(vitesse), etc.
  sumTotalStats(): Promise<unknown>;                     // SUM(totalStats)
  countWhere(minForce: number): Promise<number>;         // COUNT(*) WHERE force >= X
  selectWhere(minForce: number, limit: number): Promise<unknown[]>; // SELECT * WHERE force >= X LIMIT N
  groupByTraitCount(): Promise<unknown[]>;               // GROUP BY num_traits → AVG(totalStats)
  minMaxStats(): Promise<unknown>;                       // MIN(force), MAX(force), MIN(vitesse), MAX(vitesse)
}
