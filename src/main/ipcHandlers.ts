import { ipcMain } from 'electron'
import { MobManager } from './MobService'

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

  // Nourrir
  ipcMain.handle('mob:feed', (_event, id: string, amount: number) => {
    return MobManager.feedMob(id, amount)
  })

  // Réanimer
  ipcMain.handle('mob:revive', (_event, id: string) => {
    return MobManager.reviveMob(id)
  })

  // Renommer
  ipcMain.handle('mob:rename', (_event, id: string, newName: string) => {
    return MobManager.renameMob(id, newName)
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

  // Sauvegarder les mobs
  ipcMain.handle('mob:save', () => {
    return MobManager.saveMobs()
  })

  // Charger les mobs
  ipcMain.handle('mob:load', () => {
    return MobManager.loadMobs()
  })
}
