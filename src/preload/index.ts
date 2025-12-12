import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // Actions sur les mobs
  createMob: (nom: string, imageUrl: string) => ipcRenderer.invoke('mob:create', nom, imageUrl),
  deleteMob: (id: string) => ipcRenderer.invoke('mob:delete', id),
  damageMob: (id: string, amount: number) => ipcRenderer.invoke('mob:damage', id, amount),
  healMob: (id: string, amount: number) => ipcRenderer.invoke('mob:heal', id, amount),
  feedMob: (id: string, amount: number) => ipcRenderer.invoke('mob:feed', id, amount),
  reviveMob: (id: string) => ipcRenderer.invoke('mob:revive', id),
  renameMob: (id: string, newName: string) => ipcRenderer.invoke('mob:rename', id, newName),

  // Récupération des mobs
  getAllMobs: () => ipcRenderer.invoke('mob:getAll'),
  getMobById: (id: string) => ipcRenderer.invoke('mob:getById', id),

  // Sauvegarde et chargement
  saveMobs: () => ipcRenderer.invoke('mob:save'),
  loadMobs: () => ipcRenderer.invoke('mob:load')
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
