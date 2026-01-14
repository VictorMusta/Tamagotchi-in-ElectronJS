export type MobStatus = 'vivant' | 'mort'

export interface MobData {
    id: string
    nom: string
    imageUrl: string
    vie: number
    energie: number
    faim: number
    status: MobStatus
}

export interface MobActionResult {
    success: boolean
    mob?: MobData
    error?: string
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
