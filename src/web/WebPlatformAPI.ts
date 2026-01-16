import { PlatformAPI } from '../shared/PlatformAPI'
import { MobData, MobActionResult, MobListResult, SaveLoadResult, TournamentResult, TournamentData, TournamentHistory } from '../shared/types'
import { WebMobManager } from './WebMobManager'

/**
 * Implémentation de PlatformAPI pour le web.
 * Utilise WebMobManager avec localStorage pour la persistance.
 */
export class WebPlatformAPI implements PlatformAPI {
    async createMob(nom: string, imageUrl: string): Promise<MobActionResult> {
        const mob = WebMobManager.createMob(nom, imageUrl)
        return { success: true, mob }
    }

    async deleteMob(id: string): Promise<{ success: boolean; error?: string }> {
        const deleted = WebMobManager.deleteMob(id)
        if (!deleted) {
            return { success: false, error: 'Impossible de supprimer le mob (non trouvé ou vivant)' }
        }
        return { success: true }
    }

    async renameMob(id: string, newName: string): Promise<MobActionResult> {
        return WebMobManager.renameMob(id, newName)
    }

    async updateMobSkin(id: string, type: 'hat' | 'bottom', value: string): Promise<MobActionResult> {
        return WebMobManager.updateMobSkin(id, type, value)
    }

    async getAllMobs(): Promise<{ success: boolean; mobs: MobData[] }> {
        const mobs = WebMobManager.getAllMobs()
        return { success: true, mobs }
    }

    async getMobById(id: string): Promise<MobActionResult> {
        const mob = WebMobManager.getMobById(id)
        if (!mob) {
            return { success: false, error: 'Mob non trouvé' }
        }
        return { success: true, mob }
    }

    async processCombatResult(winner: MobData, loser: MobData): Promise<{ winner: MobData, loser: MobData, reward?: string }> {
        return WebMobManager.processCombatResult(winner, loser)
    }

    async getMobUpgradeChoices(id: string): Promise<{ success: boolean; choices: any[]; error?: string }> {
        return WebMobManager.getMobUpgradeChoices(id)
    }

    async applyMobUpgrade(id: string, choice: any): Promise<MobActionResult> {
        return WebMobManager.applyMobUpgrade(id, choice)
    }

    async processTournamentWin(id: string): Promise<MobActionResult> {
        return WebMobManager.processTournamentWin(id)
    }

    async getTournament(): Promise<TournamentResult> {
        return WebMobManager.getTournament()
    }

    async saveTournament(data: TournamentData): Promise<SaveLoadResult> {
        return WebMobManager.saveTournament(data)
    }

    async resetTournament(): Promise<SaveLoadResult> {
        return WebMobManager.resetTournament()
    }

    async getTournamentHistory(): Promise<TournamentHistory> {
        return WebMobManager.getTournamentHistory()
    }

    async saveBiome(data: any[]): Promise<SaveLoadResult> {
        return WebMobManager.saveBiome(data)
    }

    async loadBiome(): Promise<{ success: boolean; data?: any[] }> {
        return WebMobManager.loadBiome()
    }

    async saveMobs(): Promise<SaveLoadResult> {
        return WebMobManager.saveMobs()
    }

    async loadMobs(): Promise<MobListResult> {
        return WebMobManager.loadMobs()
    }

    // Web version doesn't support target actions for window
    minimizeWindow(): void { }
    closeWindow(): void { }

    setIgnoreMouseEvents(_ignore: boolean): void {
        // No-op for web
    }
}
