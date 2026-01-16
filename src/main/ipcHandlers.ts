import { ipcMain } from 'electron'
import { MobManager } from './MobService'
import { BiomeService } from './BiomeService'

/**
 * Enregistre tous les handlers IPC pour la gestion des mobs
 */
export function registerMobHandlers(): void {
  // Créer un nouveau mob
  ipcMain.handle('mob:create', (_event, nom: string, imageUrl: string) => {
    const mob = MobManager.createMob(nom, imageUrl)
    return { success: true, mob }
  })

  // Supprimer un mob
  ipcMain.handle('mob:delete', (_event, id: string) => {
    const deleted = MobManager.deleteMob(id)
    if (!deleted) {
      return { success: false, error: 'Impossible de supprimer le mob (non trouvé ou vivant)' }
    }
    return { success: true }
  })

  // Infliger des dégâts
  ipcMain.handle('mob:damage', (_event, id: string, amount: number) => {
    return MobManager.damageMob(id, amount)
  })

  // Soigner
  ipcMain.handle('mob:heal', (_event, id: string, amount: number) => {
    return MobManager.healMob(id, amount)
  })



  // Réanimer
  ipcMain.handle('mob:revive', (_event, id: string) => {
    return MobManager.reviveMob(id)
  })

  // Renommer
  ipcMain.handle('mob:rename', (_event, id: string, newName: string) => {
    return MobManager.renameMob(id, newName)
  })

  // Mettre à jour le skin
  ipcMain.handle('mob:updateSkin', (_event, id: string, type: 'hat' | 'bottom', value: string) => {
    const mob = MobManager.getMobById(id)
    if (!mob) return { success: false, error: 'Mob non trouvé' }

    // On doit passer par MobManager pour modifier l'état réel (Map)
    return MobManager.updateMobSkin(id, type, value)
  })

  // Récupérer tous les mobs
  ipcMain.handle('mob:getAll', () => {
    const mobs = MobManager.getAllMobs()
    return { success: true, mobs }
  })

  // Récupérer un mob par ID
  ipcMain.handle('mob:getById', (_event, id: string) => {
    const mob = MobManager.getMobById(id)
    if (!mob) {
      return { success: false, error: 'Mob non trouvé' }
    }
    return { success: true, mob }
  })

  // Traiter résultat combat
  ipcMain.handle('mob:processResult', (_event, winner: any, loser: any) => {
    return MobManager.processCombatResult(winner, loser)
  })

  // Sauvegarder les mobs
  ipcMain.handle('mob:save', () => {
    return MobManager.saveMobs()
  })

  // Charger les mobs
  ipcMain.handle('mob:load', () => {
    return MobManager.loadMobs()
  })

  // Obtenir les choix d'amélioration
  ipcMain.handle('mob:getUpgradeChoices', (_event, id: string) => {
    return MobManager.getMobUpgradeChoices(id)
  })

  // Appliquer un choix d'amélioration
  ipcMain.handle('mob:applyUpgrade', (_event, id: string, choice: any) => {
    return MobManager.applyMobUpgrade(id, choice)
  })

  // Sauvegarder le biome
  ipcMain.handle('biome:save', (_event, data) => {
    return BiomeService.saveBiome(data)
  })

  // Charger le biome
  ipcMain.handle('biome:load', () => {
    return BiomeService.loadBiome()
  })
}
