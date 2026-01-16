import { PlatformAPI } from '../shared/PlatformAPI'
import { MobActionResult, MobListResult, SaveLoadResult, MobData } from '../shared/types'
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

    async damageMob(id: string, amount: number): Promise<MobActionResult> {
        return WebMobManager.damageMob(id, amount)
    }

    async healMob(id: string, amount: number): Promise<MobActionResult> {
        return WebMobManager.healMob(id, amount)
    }


    async reviveMob(id: string): Promise<MobActionResult> {
        return WebMobManager.reviveMob(id)
    }

    async renameMob(id: string, newName: string): Promise<MobActionResult> {
        return WebMobManager.renameMob(id, newName)
    }

    async updateMobSkin(id: string, type: 'hat' | 'bottom', value: string): Promise<MobActionResult> {
        // Not fully implemented in web yet, but following interface
        return { success: false, error: 'Non implémenté sur le web' }
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

    async processCombatResult(winner: MobData, loser: MobData): Promise<{ winner: MobData, reward?: string }> {
        return WebMobManager.processCombatResult(winner, loser)
    }

    async getMobUpgradeChoices(_id: string): Promise<{ success: boolean; choices: any[]; error?: string }> {
        return { success: false, choices: [], error: 'Non implémenté sur le web' }
    }

    async applyMobUpgrade(_id: string, _choice: any): Promise<MobActionResult> {
        return { success: false, error: 'Non implémenté sur le web' }
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
