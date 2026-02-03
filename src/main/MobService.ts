import { randomUUID } from 'crypto'
import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

import { MobData, MobActionResult, MobListResult, SaveLoadResult, MobStatus, MobStats, MobSkin, CombatStats, TournamentResult, TournamentData, TournamentHistory } from '../shared/types'
import { WEAPON_REGISTRY } from '../shared/WeaponRegistry'

const POSSIBLE_TRAITS = [
  'Sprint Final',
  'Peau de Cuir',
  'Contre-attaque',
  'Appel de l\'Astico-Roi',
  'Main de Dentelle',
  'Berzerk'
]

/**
 * Classe Mob - Contient toute la logique métier
 */
export class Mob {
  id: string
  nom: string
  imageUrl: string
  vie: number
  energie: number
  status: MobStatus
  // Nouvelles propriétés pour le combat et la customisation
  stats: MobStats
  level: number
  experience: number
  statPoints: number
  traits: string[]
  skin: MobSkin
  combatProgress: CombatStats
  inSquad: boolean
  weapons: string[]

  constructor(
    nom: string,
    imageUrl: string,
    vie: number = 100,
    energie: number = 100,
    id?: string,
    stats?: MobStats,
    traits?: string[],
    skin?: MobSkin,
    combatProgress?: CombatStats,
    inSquad: boolean = false,
    level: number = 1,
    experience: number = 0,
    statPoints: number = 0,
    weapons?: string[]
  ) {
    this.id = id || randomUUID()
    this.nom = nom
    this.imageUrl = imageUrl
    this.vie = vie
    this.energie = energie
    this.status = vie > 0 ? 'vivant' : 'mort'
    this.level = level
    this.experience = experience
    this.statPoints = statPoints

    // Initialisation des stats (40 points aléatoires totaux, min 1 par stat)
    if (stats) {
      this.stats = stats
      // DATA SANITIZATION: Ensure all stats exist (legacy support)
      if (typeof this.stats.force !== 'number') this.stats.force = 5
      if (typeof this.stats.vitalite !== 'number') this.stats.vitalite = 5
      if (typeof this.stats.vitesse !== 'number') this.stats.vitesse = 5
      if (typeof this.stats.agilite !== 'number') this.stats.agilite = 5
    } else {
      // Logique de distribution aléatoire : 60 points total (5 base + 40 aléatoires)
      const pointsToDistribute = 40 // 40 points à distribuer aléatoirement
      const r1 = Math.random()
      const r2 = Math.random()
      const r3 = Math.random()
      const r4 = Math.random()
      const sum = r1 + r2 + r3 + r4

      this.stats = {
        force: 5 + Math.floor((r1 / sum) * pointsToDistribute),
        vitalite: 5 + Math.floor((r2 / sum) * pointsToDistribute),
        vitesse: 5 + Math.floor((r3 / sum) * pointsToDistribute),
        agilite: 5 + Math.floor((r4 / sum) * pointsToDistribute)
      }

      // Ajustement pour retomber pile sur 60 (le reste de la division)
      const currentSum = this.stats.force + this.stats.vitalite + this.stats.vitesse + this.stats.agilite
      const diff = 60 - currentSum
      if (diff > 0) {
        this.stats.force += diff // On met le reste en force par défaut
      }

      // DEBUG: Log generated stats
      console.log('[MobService] New mob stats generated:', this.stats, 'Total:', this.stats.force + this.stats.vitalite + this.stats.vitesse + this.stats.agilite)
    }

    // Recalcul des PV Max en fonction de la vitalité
    const maxHP = 100 + (this.stats.vitalite * 5)

    // Always full health in Hub
    this.vie = maxHP
    this.energie = 100
    this.status = 'vivant'

    // Initialisation des traits (3 aléatoires si non fournis)
    this.traits = traits || this.generateRandomTraits()

    // Initialisation du skin
    this.skin = skin || this.generateRandomSkin()

    // Initialisation de la progression
    this.combatProgress = combatProgress || { wins: 0, losses: 0, winStreak: 0, tournamentWins: 0 }
    if (typeof this.combatProgress.tournamentWins !== 'number') this.combatProgress.tournamentWins = 0

    // Squad logic
    this.inSquad = inSquad
    
    // Weapon Stock
    this.weapons = weapons || []
  }

  generateRandomSkin(): MobSkin {
      const HATS = ['none', 'crown', 'cap', 'wizard']
      
      return {
          hat: HATS[Math.floor(Math.random() * HATS.length)]
      }
  }

  generateRandomTraits(): string[] {
    const traits: string[] = []
    const available = [...POSSIBLE_TRAITS]
    
    // 3 traits max initially
    for(let i=0; i<3; i++) {
        if (Math.random() < 0.3 && available.length > 0) {
            const index = Math.floor(Math.random() * available.length)
            traits.push(available[index])
            available.splice(index, 1) // Avoid duplicates
        }
    }
    return traits
  }

  rename(newName: string): void {
      this.nom = newName
  }



  getMaxHP(): number {
      return 100 + (this.stats.vitalite * 5)
  }

  updateStatus(): void {
      if (this.vie <= 0) {
          this.vie = 0
          this.status = 'mort'
      } else {
          this.status = 'vivant'
      }
  }

  gainExperience(amount: number): void {
      this.experience += amount
      // Level Up Logic (Simple: every 100 * level XP)
      const threshold = this.level * 100
      while (this.experience >= threshold) {
          this.experience -= threshold
          this.level++
          this.statPoints++ // Gain 1 stat point per level
          console.log(`[Mob] ${this.nom} Level Up! Now level ${this.level}`)
          // Threshold increases
      }
  }

  upgradeStat(stat: keyof MobStats, amount: number = 1): void {
    if (this.stats[stat] !== undefined) {
      this.stats[stat] += amount
    }
  }

  generateUpgradeChoices(): any[] {
      const choices: any[] = []
      
      // 1. Random Stat Upgrade
      const stats: (keyof MobStats)[] = ['force', 'vitalite', 'vitesse', 'agilite']
      const randomStat = stats[Math.floor(Math.random() * stats.length)]
      choices.push({
          type: 'stat',
          label: `+1 ${randomStat.toUpperCase()}`,
          stat: randomStat,
          amount: 1
      })

      // 2. Random Weapon (if lucky)
      if (Math.random() < 0.4) { // 40% chance for weapon choice
          const weaponKeys = Object.keys(WEAPON_REGISTRY)
          const randomWeapon = weaponKeys[Math.floor(Math.random() * weaponKeys.length)]
          // Don't offer if already owns it? No, having duplicates in stock is fine (repair/spare) or we can restrict.
          // Let's restrict unique weapons for now to avoid confusion unless we implement durability.
          if (!this.weapons.includes(randomWeapon)) {
             choices.push({
                type: 'weapon',
                label: `Arme: ${randomWeapon}`,
                name: randomWeapon,
                description: `Ajoute ${randomWeapon} à l'arsenal.`
             })
          }
      }

      // 3. New Trait (if lucky and not maxed)
      if (Math.random() < 0.3 && this.traits.length < 6) {
          const available = POSSIBLE_TRAITS.filter(t => !this.traits.includes(t))
          if (available.length > 0) {
              const randomTrait = available[Math.floor(Math.random() * available.length)]
              choices.push({
                  type: 'trait',
                  label: `Mutation: ${randomTrait}`,
                  name: randomTrait,
                  description: "Nouvelle mutation génétique."
              })
          }
      }

      // Fill with generic consumable if not enough choices? 
      // For now just return whatever we found.
      
      return choices
  }

  /**
   * Applique un choix d'amélioration au mob
   */
  applyChoice(choice: any): void {
    if (choice.type === 'stat') {
      this.upgradeStat(choice.stat, choice.amount)
      this.statPoints-- // Consommer un point de stat
    } else if (choice.type === 'weapon') {
      const weaponDef = WEAPON_REGISTRY[choice.name]
      if (weaponDef) {
          // Add to stock instead of replacing
          this.weapons.push(choice.name)
          if (weaponDef.statBonus) {
              this.upgradeStat(weaponDef.statBonus.stat as keyof MobStats, weaponDef.statBonus.amount)
          }
          console.log(`[Mob] ${this.nom} a gagné une nouvelle arme: ${choice.name}`)
      }
    } else if (choice.type === 'trait') {
      if (!this.traits.includes(choice.name)) {
        this.traits.push(choice.name)
        this.statPoints--
      }
    }
  }

  setSkin(type: 'hat', value: string): void {
      if (type === 'hat') {
          this.skin.hat = value
      }
  }

  /**
   * Sérialise le mob en objet JSON
   */
  toJSON(): MobData {
    return {
      id: this.id,
      nom: this.nom,
      imageUrl: this.imageUrl,
      vie: this.vie,
      energie: this.energie,
      status: this.status,
      stats: this.stats,
      level: this.level,
      experience: this.experience,
      statPoints: this.statPoints,
      traits: this.traits,
      skin: this.skin,
      combatProgress: this.combatProgress,
      inSquad: this.inSquad,
      weapons: this.weapons
    }
  }

  /**
   * Crée un mob à partir de données sérialisées
   */
  static fromJSON(data: MobData & { weapon?: string }): Mob {
    // Legacy migration: if 'weapon' exists but 'weapons' doesn't, migrate it.
    let migratedWeapons = data.weapons || []
    if (data.weapon && migratedWeapons.length === 0) {
        migratedWeapons.push(data.weapon)
    }

    const mob = new Mob(
      data.nom,
      data.imageUrl,
      data.vie,
      data.energie,
      data.id,
      data.stats || undefined,
      data.traits || undefined,
      data.skin || undefined,
      data.combatProgress || undefined,
      true, // FORCE inSquad to true to prevent disappearing mobs on load
      data.level || 1,
      data.experience || 0,
      data.statPoints || 0,
      migratedWeapons
    )
    // Force full heal / revive logic on load (Hub = Safe Zone)
    mob.vie = mob.getMaxHP()
    mob.energie = 100
    mob.status = 'vivant'
    
    // Sanitize Traits (deduplicate)
    mob.traits = Array.from(new Set(mob.traits))
    
    return mob
  }
}

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
    } else {
      console.warn(`[MobService] Loser not found in Map (expected for PNJs): ${loserData.id}`)
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
    } else {
      console.warn(`[MobService] Winner not found in Map (expected for PNJs): ${winnerData.id}`)
    }

    this.saveMobs()

    return {
      winner: winner ? winner.toJSON() : { ...winnerData, vie: 100 + (winnerData.stats.vitalite * 5), status: 'vivant' },
      loser: loser ? loser.toJSON() : { ...loserData, vie: 100 + (loserData.stats.vitalite * 5), status: 'vivant' },
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

  /**
   * Tournois
   */
  private getTournamentSavePath(): string {
    const userDataPath = app.getPath('userData')
    return join(userDataPath, 'tournament.json')
  }

  private getTournamentHistorySavePath(): string {
    const userDataPath = app.getPath('userData')
    return join(userDataPath, 'tournament_history.json')
  }

  getTournament(): TournamentResult {
    try {
      const path = this.getTournamentSavePath()
      if (!existsSync(path)) return { success: true }
      const data = readFileSync(path, 'utf-8')
      const tournament: TournamentData = JSON.parse(data)
      return { success: true, tournament }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  getTournamentHistory(): TournamentHistory {
    try {
      const path = this.getTournamentHistorySavePath()
      if (!existsSync(path)) return { success: true, tournaments: [] }
      const data = readFileSync(path, 'utf-8')
      const tournaments: TournamentData[] = JSON.parse(data)
      return { success: true, tournaments }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  saveTournament(data: TournamentData): SaveLoadResult {
    try {
      // Sauvegarde du tournoi actuel
      const path = this.getTournamentSavePath()
      writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8')

      // Si le tournoi est fini, on l'ajoute à l'historique
      if (data.status === 'completed') {
        this.archiveTournament(data)
      }

      return { success: true, path }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  private archiveTournament(tournament: TournamentData): void {
    try {
      const historyPath = this.getTournamentHistorySavePath()
      let history: TournamentData[] = []
      if (existsSync(historyPath)) {
        history = JSON.parse(readFileSync(historyPath, 'utf-8'))
      }

      // Éviter les doublons si on sauvegarde plusieurs fois un tournoi fini
      if (!history.find(t => t.id === tournament.id)) {
        history.push(tournament)
        writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf-8')
      }
    } catch (error) {
      console.error('Erreur lors de l\'archivage du tournoi:', error)
    }
  }

  resetTournament(): SaveLoadResult {
    try {
      const path = this.getTournamentSavePath()
      if (existsSync(path)) {
        const fs = require('fs')
        fs.unlinkSync(path)
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }
}

// Export du singleton
export const MobManager = new MobManagerClass()
