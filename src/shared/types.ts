export type MobStatus = 'vivant' | 'mort'

export interface MobStats {
    force: number
    vitesse: number
    agilite: number
    vitalite: number
}

export interface MobSkin {
    hat: string
    bottom: string
}

export interface CombatStats {
    wins: number
    losses: number
    winStreak: number
    tournamentWins: number
}

export interface MobData {
    id: string
    nom: string
    imageUrl: string
    vie: number
    energie: number
    status: MobStatus
    // Nouvelles propriétés pour le combat et la customisation
    stats: MobStats
    level: number
    experience: number
    statPoints: number // Points disponibles à dépenser (ou utilisés lors du spawn)
    traits: string[]
    skin: MobSkin
    combatProgress: CombatStats
    inSquad: boolean // True if in active squad (Hub), false if in Box
    weapons: string[] // List of owned weapons
}

export interface MobActionResult {
    success: boolean
    mob?: MobData
    error?: string
    changed?: boolean
}

export interface MobListResult {
    success: boolean
    mobs?: MobData[]
    error?: string
}

export interface MobCreateResult {
    success: boolean
    mob?: MobData
    error?: string
}

export interface SaveLoadResult {
    success: boolean
    path?: string
    error?: string
}

// Upgrade system types
export type UpgradeChoice =
    | { type: 'stat'; stat: keyof MobStats; amount: number; label: string }
    | { type: 'weapon'; name: string; label: string }
    | { type: 'trait'; name: string; label: string; description: string }

export interface UpgradeChoicesResult {
    success: boolean
    choices?: UpgradeChoice[]
    error?: string
}

export interface ApplyUpgradeResult {
    success: boolean
    mob?: MobData
    error?: string
}


// Tournament system types
export interface TournamentParticipant {
    id: string
    nom: string
    imageUrl: string
    stats: MobStats
    level: number
    isPlayer: boolean
}

export interface TournamentMatch {
    id: string
    participant1?: TournamentParticipant
    participant2?: TournamentParticipant
    winnerId?: string
    isCompleted: boolean
}

export interface TournamentRound {
    matches: TournamentMatch[]
}

export interface TournamentData {
    id: string
    status: 'active' | 'completed'
    rounds: TournamentRound[] // [0] = Quarts, [1] = Semis, [2] = Final
    winnerId?: string
    currentRoundIndex: number
    currentMatchIndex: number
}

export interface TournamentResult {
    success: boolean
    tournament?: TournamentData
    error?: string
}

export interface TournamentHistory {
    success: boolean
    tournaments?: TournamentData[]
    error?: string
}
