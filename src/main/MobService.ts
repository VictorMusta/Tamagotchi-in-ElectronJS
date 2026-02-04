import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

import { MobData, MobActionResult, MobListResult, SaveLoadResult, TournamentResult, TournamentData, TournamentHistory } from '../shared/types'
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
  processCombatResult(winnerData: MobData, loserData: MobData): { winner: MobData, loser: MobData, reward?: string } {
    console.log(`[MobService] processCombatResult: Winner=${winnerData.nom} (${winnerData.id}), Loser=${loserData.nom} (${loserData.id})`)
    const winner = this.mobs.get(winnerData.id)
    const loser = this.mobs.get(loserData.id)

    if (loser) {
      console.log(`[MobService] Healing loser: ${loser.nom}`)
      loser.vie = loser.getMaxHP()
      loser.energie = 100
      loser.updateStatus()
    }

    let reward: string | undefined
    if (winner) {
      console.log(`[MobService] Healing winner: ${winner.nom}`)
      winner.vie = winner.getMaxHP()
      winner.energie = 100
      winner.updateStatus()

      winner.combatProgress.wins++
      winner.combatProgress.winStreak++

      // XP GAIN POUR VICTOIRE
      winner.gainExperience(50)

      if (winner.combatProgress.winStreak >= 5) {
        reward = 'Fiole de Réanimation'
        winner.combatProgress.winStreak = 0
      }
    }

    this.saveMobs()

    return {
      winner: winner ? winner.toJSON() : { ...winnerData, vie: 100 + (winnerData.stats.vitalite * (winnerData.hpMultiplier || 10)), status: 'vivant' },
      loser: loser ? loser.toJSON() : { ...loserData, vie: 100 + (loserData.stats.vitalite * (loserData.hpMultiplier || 10)), status: 'vivant' },
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
