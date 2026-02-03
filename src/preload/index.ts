import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { MobListResult, UpgradeChoicesResult, UpgradeChoice, ApplyUpgradeResult } from '../shared/types'

// Custom APIs for renderer
const api = {
  // Actions sur les mobs
  createMob: (nom: string, imageUrl: string) => ipcRenderer.invoke('mob:create', nom, imageUrl),
  deleteMob: (id: string) => ipcRenderer.invoke('mob:delete', id),
  deleteAllMobs: () => ipcRenderer.invoke('mob:deleteAll'),
  renameMob: (id: string, newName: string) => ipcRenderer.invoke('mob:rename', id, newName),
  updateMobSkin: (id: string, type: 'hat', value: string) => ipcRenderer.invoke('mob:updateSkin', id, type, value),
  toggleSquad: (id: string) => ipcRenderer.invoke('mob:toggleSquad', id),

  // Récupération des mobs
  getAllMobs: () => ipcRenderer.invoke('mob:getAll'),
  getMobById: (id: string) => ipcRenderer.invoke('mob:getById', id),
  processCombatResult: (winner: any, loser: any) => ipcRenderer.invoke('mob:processResult', winner, loser),

  // Sauvegarde et chargement
  saveMobs: () => ipcRenderer.invoke('mob:save'),
  loadMobs: (): Promise<MobListResult> => ipcRenderer.invoke('mob:load'),

  getMobUpgradeChoices: (id: string): Promise<UpgradeChoicesResult> => ipcRenderer.invoke('mob:getUpgradeChoices', id),
  applyMobUpgrade: (id: string, choice: UpgradeChoice): Promise<ApplyUpgradeResult> => ipcRenderer.invoke('mob:applyUpgrade', id, choice),
  processTournamentWin: (id: string) => ipcRenderer.invoke('mob:processTournamentWin', id),
  getTournament: () => ipcRenderer.invoke('mob:getTournament'),
  saveTournament: (data: any) => ipcRenderer.invoke('mob:saveTournament', data),
  resetTournament: () => ipcRenderer.invoke('mob:resetTournament'),
  getTournamentHistory: () => ipcRenderer.invoke('mob:getTournamentHistory'),
  setIgnoreMouseEvents: (ignore: boolean) => ipcRenderer.send('window:set-ignore-mouse-events', ignore),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  // PvE
  getPveEnemies: (mobId: string, mobLevel: number) => ipcRenderer.invoke('pve:getEnemies', mobId, mobLevel),
  clearPveCache: (mobId: string) => ipcRenderer.invoke('pve:clearCache', mobId),

  // Memorial
  getMemorial: () => ipcRenderer.invoke('memorial:get'),
  addToMemorial: (mob: any, killedBy: string) => ipcRenderer.invoke('memorial:add', mob, killedBy),

  // Inventory
  getInventory: () => ipcRenderer.invoke('inventory:get'),
  addPotion: () => ipcRenderer.invoke('inventory:addPotion'),
  usePotion: () => ipcRenderer.invoke('inventory:usePotion'),
  getPotionCount: () => ipcRenderer.invoke('inventory:getPotionCount')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
