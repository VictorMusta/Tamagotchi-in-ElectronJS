import { MobData, MobActionResult, MobListResult, SaveLoadResult } from './types'

/**
 * Interface platforme-agnostique pour les opérations sur les mobs.
 * Permet d'avoir la même API entre Electron (IPC) et Web (localStorage).
 */
export interface PlatformAPI {
    // Actions sur les mobs
    createMob(nom: string, imageUrl: string): Promise<MobActionResult>
    deleteMob(id: string): Promise<{ success: boolean; error?: string }>
    damageMob(id: string, amount: number): Promise<MobActionResult>
    healMob(id: string, amount: number): Promise<MobActionResult>

    reviveMob(id: string): Promise<MobActionResult>
    renameMob(id: string, newName: string): Promise<MobActionResult>

    // Récupération des mobs
    getAllMobs(): Promise<{ success: boolean; mobs: MobData[] }>
    getMobById(id: string): Promise<MobActionResult>

    // Sauvegarde et chargement
    saveMobs(): Promise<SaveLoadResult>
    loadMobs(): Promise<MobListResult>

    // Electron-specific (optional)
    setIgnoreMouseEvents?(ignore: boolean): void
}
