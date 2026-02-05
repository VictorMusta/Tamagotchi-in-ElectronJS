import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

import { MobData, MobStatus, MobActionResult, MobListResult, SaveLoadResult, TournamentResult, TournamentData, TournamentHistory } from '../shared/types'
import { Mob } from './MobModel'
import { TournamentService } from './TournamentService'

/**
 * Gestionnaire de la collection de mobs (Singleton)
 */
class MobManagerClass {
  private mobs: Map<string, Mob> = new Map()

  /**
   * Chemin du fichier de sauvegarde
   */
  private getSavePath(): string {
    return join(app.getPath('userData'), 'mobs-save.json')
  }

  /**
   * Crée un nouveau mob avec un nom unique
   */
  createMob(nom: string, imageUrl: string): MobData {
    const uniqueName = this.getUniqueName(nom)

    // Check squad size
    const squadSize = Array.from(this.mobs.values()).filter(m => m.inSquad).length
    const inSquad = squadSize < 10

    const mob = new Mob(uniqueName, imageUrl, 100, 100, undefined, undefined, undefined, undefined, undefined, inSquad)
    this.mobs.set(mob.id, mob)

    // Auto-save
    this.saveMobs()

    return mob.toJSON()
  }

  toggleSquad(id: string): MobActionResult {
    const mob = this.mobs.get(id)
    if (!mob) return { success: false, error: 'Mob non trouvé' }

    if (mob.inSquad) {
      // Removing from squad is always allowed
      mob.inSquad = false
    } else {
      // Adding to squad: check limit
      const squadSize = Array.from(this.mobs.values()).filter(m => m.inSquad).length
      if (squadSize >= 10) {
        return { success: false, error: 'L\'équipe est complète (10 max)' }
      }
      mob.inSquad = true
    }

    this.saveMobs()
    return { success: true, mob: mob.toJSON() }
  }

  /**
   * Supprime un mob par son ID
   */
  deleteMob(id: string): boolean {
    const mob = this.mobs.get(id)
    if (!mob) return false
    const deleted = this.mobs.delete(id)
    if (deleted) {
      this.saveMobs()
    }
    return deleted
  }

  /**
   * Récupère un mob par son ID
   */
  getMobById(id: string): MobData | null {
    const mob = this.mobs.get(id)
    return mob ? mob.toJSON() : null
  }

  /**
   * Supprime tous les mobs
   */
  deleteAllMobs(): boolean {
    this.mobs.clear()
    this.saveMobs()
    return true
  }

  /**
   * Récupère tous les mobs
   */
  getAllMobs(): MobData[] {
    return Array.from(this.mobs.values()).map((mob) => mob.toJSON())
  }

  /**
   * Renomme un mob avec validation de l'unicité
   */
  renameMob(id: string, newName: string): MobActionResult {
    const mob = this.mobs.get(id)
    if (!mob) {
      return { success: false, error: 'Mob non trouvé' }
    }
    const uniqueName = this.getUniqueName(newName, id)
    mob.rename(uniqueName)
    return { success: true, mob: mob.toJSON() }
  }

  /**
   * Met à jour le skin d'un mob
   */
  updateMobSkin(id: string, type: 'hat', value: string): MobActionResult {
    const mob = this.mobs.get(id)
    if (!mob) {
      return { success: false, error: 'Mob non trouvé' }
    }
    mob.setSkin(type, value)
    return { success: true, mob: mob.toJSON() }
  }

  /**
   * Génère un nom unique en ajoutant un numéro incrémental si nécessaire
   */
  private getUniqueName(baseName: string, excludeId?: string): string {
    let name = baseName
    let counter = 2

    while (Array.from(this.mobs.values()).some((m) => m.id !== excludeId && m.nom === name)) {
      name = `${baseName} ${counter}`
      counter++
    }

    return name
  }

  updateMobOnsenState(id: string, isInOnsen: boolean, timestamp: number | null, hpAtEntry: number | null, onsenPosition: {x:number, y:number} | null): MobActionResult {
    const mob = this.mobs.get(id)
    if (!mob) return { success: false, error: 'Mob non trouvé' }

    mob.isInOnsen = isInOnsen
    mob.lastOnsenEntryTimestamp = timestamp
    mob.hpAtOnsenEntry = hpAtEntry
    // Only update position if entering or moving in Onsen (if provided)
    // If exiting (isInOnsen=false), we might strictly want to clear it, or keep it?
    // User wants "respawn at same position", so we should keep it if in Onsen.
    // If not in Onsen, we reset it to null.
    if (!isInOnsen) {
        mob.onsenPosition = null
    } else if (onsenPosition) {
        mob.onsenPosition = onsenPosition
    }

    this.saveMobs()
    return { success: true, mob: mob.toJSON() }
  }

  updateMobHP(id: string, newHP: number): MobActionResult {
    const mob = this.mobs.get(id)
    if (!mob) return { success: false, error: 'Mob non trouvé' }

    // Calculate maxHP
    const maxHP = mob.getMaxHP()
    
    // CRITICAL: If HP decreased (damage taken), we must reset Onsen state logic
    // so that calculateCurrentHP doesn't overwrite it with old healing data.
    // However, if HP INCREASED (healing), we MUST keep the Onsen state
    // so that offline healing calculation remains consistent.
    if (newHP < mob.vie && mob.isInOnsen) {
        console.log(`[MobService] Mob ${mob.nom} took damage (${mob.vie} -> ${newHP}), removing from Onsen.`)
        mob.isInOnsen = false
        mob.hpAtOnsenEntry = null
        mob.lastOnsenEntryTimestamp = null
        mob.onsenPosition = null
    }

    // Update HP
    mob.vie = Math.max(0, Math.min(newHP, maxHP))
    
    // Update Status
    mob.updateStatus()

    this.saveMobs()
    console.log(`[MobService] updateMobHP finished for ${id}. New HP: ${mob.vie}, isInOnsen: ${mob.isInOnsen}`)
    return { success: true, mob: mob.toJSON() }
  }

  updateMobStatus(id: string, status: 'vivant' | 'mort'): MobActionResult {
    const mob = this.mobs.get(id)
    if (!mob) return { success: false, error: 'Mob non trouvé' }

    mob.status = status

    this.saveMobs()
    return { success: true, mob: mob.toJSON() }
  }

  /**
   * Sauvegarde tous les mobs dans un fichier
   */
  saveMobs(): SaveLoadResult {
    try {
      const savePath = this.getSavePath()
      const mobsData = this.getAllMobs()
      const jsonString = JSON.stringify(mobsData, null, 2)
      writeFileSync(savePath, jsonString, 'utf-8')
      console.log('Mobs sauvegardés dans:', savePath)
      return { success: true, path: savePath }
    } catch (error) {
      console.error('Erreur de sauvegarde:', error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * Charge les mobs depuis un fichier
   */
  loadMobs(): MobListResult {
    try {
      const savePath = this.getSavePath()
      if (!existsSync(savePath)) {
        return { success: false, error: 'Aucune sauvegarde trouvée' }
      }
      const data = readFileSync(savePath, 'utf-8')
      const mobsData: MobData[] = JSON.parse(data)

      // Vider la collection actuelle et charger les nouveaux mobs
      this.mobs.clear()
      mobsData.forEach((mobData) => {
        const mob = Mob.fromJSON(mobData)
        this.mobs.set(mob.id, mob)
      })

      console.log('Mobs chargés:', this.mobs.size)
      return { success: true, mobs: this.getAllMobs() }
    } catch (error) {
      console.error('Erreur de chargement:', error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * Réinitialise la collection (pour les tests ou le rechargement)
   */
  clear(): void {
    this.mobs.clear()
  }

  /**
   * Retourne le nombre de mobs
   */
  count(): number {
    return this.mobs.size
  }

  /**
   * Traite le résultat d'un combat
   */
  processCombatResult(winnerData: MobData, loserData: MobData, options: { grantXP?: boolean } = { grantXP: true }): { winner: MobData, loser: MobData, reward?: string } {
    console.log(`[MobService] START processCombatResult for ${winnerData.nom} (${winnerData.vie} HP) and ${loserData.nom}. grantXP: ${options.grantXP}`)
    const winner = this.mobs.get(winnerData.id)
    const loser = this.mobs.get(loserData.id)
    
    if (winner) console.log(`[MobService] Found winner in backend. Pre-update HP: ${winner.vie}, isInOnsen: ${winner.isInOnsen}`)
    if (loser) console.log(`[MobService] Found loser in backend. Pre-update HP: ${loser.vie}`)

    if (loser) {
      console.log(`[MobService] Processing loser: ${loser.nom}`)
      // PERSIST HP FROM COMBAT
      loser.vie = loserData.vie
      loser.energie = loserData.energie
      
      // CRITICAL: Clear Onsen state so toJSON doesn't overwrite HP
      loser.isInOnsen = false
      loser.hpAtOnsenEntry = null
      loser.lastOnsenEntryTimestamp = null
      loser.onsenPosition = null

      // Force status update based on new HP
      loser.updateStatus()
      if (loser.vie <= 0) { 
        loser.status = 'mort' 
      }
    }

    let reward: string | undefined
    if (winner) {
      console.log(`[MobService] Processing winner: ${winner.nom}`)
      // PERSIST HP FROM COMBAT
      winner.vie = winnerData.vie
      winner.energie = winnerData.energie
      
      // CRITICAL: Clear Onsen state so toJSON doesn't overwrite HP
      winner.isInOnsen = false
      winner.hpAtOnsenEntry = null
      winner.lastOnsenEntryTimestamp = null
      winner.onsenPosition = null

      // Force status update
      winner.updateStatus()

      // XP GAIN POUR VICTOIRE
      if (options.grantXP) {
        winner.gainExperience(50)

        if (winner.combatProgress.winStreak >= 5) {
          reward = 'Fiole de Réanimation'
          winner.combatProgress.winStreak = 0
        }
      }
    }

    this.saveMobs()
    console.log(`[MobService] END processCombatResult. Saved HP - Winner: ${winner?.vie}, Loser: ${loser?.vie}`)

    const winnerJSON = winner ? winner.toJSON() : { ...winnerData, status: 'vivant' as MobStatus }
    console.log(`[MobService] processCombatResult winnerJSON HP: ${winnerJSON.vie}`)

    return {
      winner: winnerJSON,
      loser: loser ? loser.toJSON() : { ...loserData, status: 'vivant' as MobStatus },
      reward
    }
  }

  /**
   * Génère 3 choix d'amélioration pour un mob
   */
  getMobUpgradeChoices(id: string): any {
    const mob = this.mobs.get(id)
    if (!mob) {
      return { success: false, error: 'Mob non trouvé' }
    }
    if (mob.statPoints <= 0) {
      return { success: false, error: 'Aucun point de stat disponible' }
    }
    const choices = mob.generateUpgradeChoices()
    return { success: true, choices }
  }

  /**
   * Applique un choix d'amélioration à un mob
   */
  applyMobUpgrade(id: string, choice: any): any {
    const mob = this.mobs.get(id)
    if (!mob) {
      return { success: false, error: 'Mob non trouvé' }
    }
    if (mob.statPoints <= 0) {
      return { success: false, error: 'Aucun point de stat disponible' }
    }
    mob.applyChoice(choice)
    this.saveMobs()
    return { success: true, mob: mob.toJSON() }
  }

  processTournamentWin(id: string): MobActionResult {
    const mob = this.mobs.get(id)
    if (!mob) return { success: false, error: 'Mob non trouvé' }

    mob.combatProgress.tournamentWins++
    mob.gainExperience(500) // 500 XP pour une victoire de tournoi

    return { success: true, mob: mob.toJSON() }
  }

  // --- Delegation to TournamentService ---

  getTournament(): TournamentResult {
    return TournamentService.getTournament()
  }

  getTournamentHistory(): TournamentHistory {
    return TournamentService.getTournamentHistory()
  }

  saveTournament(data: TournamentData): SaveLoadResult {
    return TournamentService.saveTournament(data)
  }

  resetTournament(): SaveLoadResult {
    return TournamentService.resetTournament()
  }
}

// Export du singleton
export const MobManager = new MobManagerClass()
