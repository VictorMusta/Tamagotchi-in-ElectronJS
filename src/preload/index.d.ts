import { ElectronAPI } from '@electron-toolkit/preload'

import {
  MobData,
  MobActionResult,
  MobListResult,
  MobCreateResult,
  SaveLoadResult,
  UpgradeChoicesResult,
  ApplyUpgradeResult,
  TournamentResult,
  TournamentData,
  TournamentHistory,
  PveEnemiesResult,
  MemorialResult,
  InventoryResult
} from '../shared/types'

interface CustomAPI {
  // Actions sur les mobs
  createMob: (nom: string, imageUrl: string) => Promise<MobCreateResult>
  deleteMob: (id: string) => Promise<{ success: boolean; error?: string }>
  deleteAllMobs: () => Promise<{ success: boolean; error?: string }>
  renameMob: (id: string, newName: string) => Promise<MobActionResult>
  updateMobSkin: (id: string, type: 'hat', value: string) => Promise<MobActionResult>

  // Récupération des mobs
  getAllMobs: () => Promise<MobListResult>
  getMobById: (id: string) => Promise<MobActionResult>
  processCombatResult: (winner: MobData, loser: MobData) => Promise<{ winner: MobData; loser: MobData; reward?: string }>

  // Sauvegarde et chargement
  saveMobs: () => Promise<SaveLoadResult>
  loadMobs: () => Promise<MobListResult>

  getMobUpgradeChoices: (id: string) => Promise<UpgradeChoicesResult>
  applyMobUpgrade: (id: string, choice: any) => Promise<ApplyUpgradeResult>
  processTournamentWin: (id: string) => Promise<MobActionResult>

  // Tournament
  getTournament: () => Promise<TournamentResult>
  saveTournament: (data: TournamentData) => Promise<SaveLoadResult>
  resetTournament: () => Promise<SaveLoadResult>
  getTournamentHistory: () => Promise<TournamentHistory>

  // Utilitaires
  setIgnoreMouseEvents?: (ignore: boolean) => void

  // Biome
  saveBiome: (data: any[]) => Promise<{ success: boolean; path?: string; error?: string }>
  loadBiome: () => Promise<{ success: boolean; data?: any[]; error?: string }>
  minimizeWindow: () => void
  closeWindow: () => void

  // PvE
  getPveEnemies: (mobId: string, mobLevel: number) => Promise<PveEnemiesResult>
  clearPveCache: (mobId: string) => Promise<{ success: boolean }>

  // Memorial
  getMemorial: () => Promise<MemorialResult>
  addToMemorial: (mob: MobData, killedBy: string) => Promise<{ success: boolean }>

  // Inventory
  getInventory: () => Promise<InventoryResult>
  addPotion: () => Promise<{ success: boolean }>
  usePotion: () => Promise<{ success: boolean }>
  getPotionCount: () => Promise<{ success: boolean; count: number }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomAPI
  }
}
