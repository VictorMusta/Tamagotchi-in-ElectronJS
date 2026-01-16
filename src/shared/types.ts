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

