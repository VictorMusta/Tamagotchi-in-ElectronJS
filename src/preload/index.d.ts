import { ElectronAPI } from '@electron-toolkit/preload'

import {
  MobData,
  MobStatus,
  MobActionResult,
  MobListResult,
  MobCreateResult,
  SaveLoadResult,
  UpgradeChoicesResult,
  UpgradeChoice,
  ApplyUpgradeResult
} from '../shared/types'

interface CustomAPI {
  // Actions sur les mobs
  createMob: (nom: string, imageUrl: string) => Promise<MobCreateResult>
  deleteMob: (id: string) => Promise<{ success: boolean; error?: string }>
  damageMob: (id: string, amount: number) => Promise<MobActionResult>
  healMob: (id: string, amount: number) => Promise<MobActionResult>

  reviveMob: (id: string) => Promise<MobActionResult>
  renameMob: (id: string, newName: string) => Promise<MobActionResult>
  updateMobSkin: (id: string, type: 'hat' | 'bottom', value: string) => Promise<MobActionResult>

  // Récupération des mobs
  getAllMobs: () => Promise<MobListResult>
  getMobById: (id: string) => Promise<MobActionResult>
  processCombatResult: (winnerId: string, loserId: string) => Promise<{ winner: MobData; reward?: string }>

  // Sauvegarde et chargement
  saveMobs: () => Promise<SaveLoadResult>
  loadMobs: () => Promise<MobListResult>

  getUpgradeChoices: (id: string) => Promise<UpgradeChoicesResult>
  applyUpgrade: (id: string, choice: UpgradeChoice) => Promise<ApplyUpgradeResult>

  // Utilitaires
  setIgnoreMouseEvents?: (ignore: boolean) => void

  // Biome
  saveBiome: (data: any[]) => Promise<{ success: boolean; path?: string; error?: string }>
  loadBiome: () => Promise<{ success: boolean; data?: any[]; error?: string }>
  minimizeWindow: () => void
  closeWindow: () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomAPI
  }
}
