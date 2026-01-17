import { MobData, MobActionResult, MobListResult, SaveLoadResult, TournamentResult, TournamentData, TournamentHistory } from './types'

/**
 * Interface platforme-agnostique pour les opérations sur les mobs.
 * Permet d'avoir la même API entre Electron (IPC) et Web (localStorage).
 */
export interface PlatformAPI {
    // Actions sur les mobs
    createMob(nom: string, imageUrl: string): Promise<MobActionResult>
    deleteMob(id: string): Promise<{ success: boolean; error?: string }>

    renameMob(id: string, newName: string): Promise<MobActionResult>
    updateMobSkin(id: string, type: 'hat' | 'bottom', value: string): Promise<MobActionResult>
    toggleSquad(id: string): Promise<MobActionResult>

    // Récupération des mobs
    getAllMobs(): Promise<{ success: boolean; mobs: MobData[] }>
    getMobById(id: string): Promise<MobActionResult>

    // Combat
    processCombatResult(winner: MobData, loser: MobData): Promise<{ winner: MobData, loser: MobData, reward?: string }>
    getMobUpgradeChoices(id: string): Promise<{ success: boolean; choices: any[]; error?: string }>
    applyMobUpgrade(id: string, choice: any): Promise<MobActionResult>
    processTournamentWin(id: string): Promise<MobActionResult>

    // Tournoi
    getTournament(): Promise<TournamentResult>
    saveTournament(data: TournamentData): Promise<SaveLoadResult>
    resetTournament(): Promise<SaveLoadResult>
    getTournamentHistory(): Promise<TournamentHistory>

    // Biome
    saveBiome(data: any[]): Promise<SaveLoadResult>
    loadBiome(): Promise<{ success: boolean; data?: any[]; error?: string }>

    // Sauvegarde et chargement
    saveMobs(): Promise<SaveLoadResult>
    loadMobs(): Promise<MobListResult>

    // Electron-specific (optional)
    minimizeWindow?(): void
    closeWindow?(): void
    setIgnoreMouseEvents?(ignore: boolean): void
}
