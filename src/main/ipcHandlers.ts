import { ipcMain } from 'electron'
import { MobManager } from './MobService'
import { PveService } from './PveService'
import { MemorialService } from './MemorialService'
import { InventoryService } from './InventoryService'

/**
 * Enregistre tous les handlers IPC pour la gestion des mobs
 */
export function registerMobHandlers(): void {
  console.log('[IPC] Registering Mob handlers...')

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

  // Supprimer TOUS les mobs
  ipcMain.handle('mob:deleteAll', () => {
    MobManager.deleteAllMobs()
    return { success: true }
  })

  // Réanimer (removed from UI but kept for backend if needed? No, user said "supprime les modes")
  // So let's delete them.

  // Renommer
  ipcMain.handle('mob:rename', (_event, id: string, newName: string) => {
    return MobManager.renameMob(id, newName)
  })

  // Mettre à jour le skin
  ipcMain.handle('mob:updateSkin', (_event, id: string, type: 'hat', value: string) => {
    const mob = MobManager.getMobById(id)
    if (!mob) return { success: false, error: 'Mob non trouvé' }

    return MobManager.updateMobSkin(id, type, value)
  })

  // Toggle Squad status
  ipcMain.handle('mob:toggleSquad', (_event, id: string) => {
    return MobManager.toggleSquad(id)
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

  ipcMain.handle('mob:processTournamentWin', (_event, id: string) => {
    return MobManager.processTournamentWin(id)
  })

  // Tournoi
  ipcMain.handle('mob:getTournament', () => {
    return MobManager.getTournament()
  })

  ipcMain.handle('mob:saveTournament', (_event, data) => {
    return MobManager.saveTournament(data)
  })

  ipcMain.handle('mob:resetTournament', () => {
    return MobManager.resetTournament()
  })

  ipcMain.handle('mob:getTournamentHistory', () => {
    console.log('[IPC] Handling mob:getTournamentHistory')
    return MobManager.getTournamentHistory()
  })

  // --- PvE Handlers ---
  ipcMain.handle('pve:getEnemies', (_event, mobId: string, mobLevel: number) => {
    return PveService.getEnemiesForMob(mobId, mobLevel)
  })

  ipcMain.handle('pve:clearCache', (_event, mobId: string) => {
    PveService.clearCacheForMob(mobId)
    return { success: true }
  })

  // --- Memorial Handlers ---
  ipcMain.handle('memorial:get', () => {
    return MemorialService.getMemorial()
  })

  ipcMain.handle('memorial:add', (_event, mob: any, killedBy: string) => {
    MemorialService.addToMemorial(mob, killedBy)
    return { success: true }
  })

  // --- Inventory Handlers ---
  ipcMain.handle('inventory:get', () => {
    return InventoryService.getInventory()
  })

  ipcMain.handle('inventory:addPotion', () => {
    InventoryService.addPotion()
    return { success: true }
  })

  ipcMain.handle('inventory:usePotion', () => {
    const used = InventoryService.usePotion()
    return { success: used }
  })

  ipcMain.handle('inventory:getPotionCount', () => {
    return { success: true, count: InventoryService.getPotionCount() }
  })
}
