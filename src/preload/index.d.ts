import { ElectronAPI } from '@electron-toolkit/preload'

import {
  MobData,
  MobStatus,
  MobActionResult,
  MobListResult,
  MobCreateResult,
  SaveLoadResult
} from '../shared/types'

interface CustomAPI {
  // Actions sur les mobs
  createMob: (nom: string, imageUrl: string) => Promise<MobCreateResult>
  deleteMob: (id: string) => Promise<{ success: boolean; error?: string }>
  damageMob: (id: string, amount: number) => Promise<MobActionResult>
  healMob: (id: string, amount: number) => Promise<MobActionResult>
  feedMob: (id: string, amount: number) => Promise<MobActionResult>
  reviveMob: (id: string) => Promise<MobActionResult>
  renameMob: (id: string, newName: string) => Promise<MobActionResult>

  // Récupération des mobs
  getAllMobs: () => Promise<MobListResult>
  getMobById: (id: string) => Promise<MobActionResult>

  // Sauvegarde et chargement
  saveMobs: () => Promise<SaveLoadResult>
  loadMobs: () => Promise<MobListResult>

  // Utilitaires
  setIgnoreMouseEvents?: (ignore: boolean) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomAPI
  }
}
