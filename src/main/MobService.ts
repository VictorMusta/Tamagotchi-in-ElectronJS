import { randomUUID } from 'crypto'
import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

import { MobData, MobActionResult, MobListResult, SaveLoadResult, MobStatus, MobStats, MobSkin, CombatStats, TournamentResult, TournamentData, TournamentHistory } from '../shared/types'

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
    statPoints: number = 0
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
    this.skin = skin || {
      hat: 'none',
      bottom: 'none'
    }

    // Initialisation de la progression
    this.combatProgress = combatProgress || { wins: 0, losses: 0, winStreak: 0, tournamentWins: 0 }
    if (typeof this.combatProgress.tournamentWins !== 'number') this.combatProgress.tournamentWins = 0

    // Squad logic
    this.inSquad = inSquad
  }

  /**
   * Génère 3 traits aléatoires sans doublons
   */
  private generateRandomTraits(): string[] {
    const traits: string[] = []
    const available = [...POSSIBLE_TRAITS]
    for (let i = 0; i < 3; i++) {
      const index = Math.floor(Math.random() * available.length)
      traits.push(available.splice(index, 1)[0])
    }
    return traits
  }

  /**
   * Met à jour le statut du mob en fonction de sa vie
   */
  public updateStatus(): void {
    this.status = this.vie > 0 ? 'vivant' : 'mort'
  }

  /**
   * Calcule les PV Max du mob
   */
  public getMaxHP(): number {
    return 100 + (this.stats.vitalite * 5)
  }

  /**
   * Inflige des dégâts au mob
   * @returns true si le mob vient de mourir
   */
  takeDamage(amount: number): boolean {
    const wasAlive = this.status === 'vivant'
    this.vie = Math.max(0, this.vie - amount)
    this.updateStatus()
    return wasAlive && this.status === 'mort'
  }

  /**
   * Soigne le mob
   * @returns true si le soin a été appliqué
   */
  heal(amount: number): boolean {
    if (this.status === 'mort') return false
    const maxHP = this.getMaxHP()
    this.vie = Math.min(maxHP, this.vie + amount)
    this.updateStatus()
    return true
  }



  /**
   * Réanime le mob
   * @returns true si le mob a été réanimé
   */
  revive(): boolean {
    if (this.status === 'vivant') return false
    this.vie = Math.floor(this.getMaxHP() / 2) // 50% HP
    this.energie = 50
    this.updateStatus()
    return true
  }

  /**
   * Renomme le mob
   */
  rename(newName: string): void {
    this.nom = newName
  }

  /**
   * Modifie l'énergie du mob
   */
  setEnergie(amount: number): void {
    this.energie = Math.max(0, Math.min(100, amount))
  }



  /**
   * Modifie le skin du mob
   */
  setSkin(type: 'hat' | 'bottom', value: string): void {
    this.skin[type] = value
  }

  /**
   * Ajoute de l'XP et gère la montée de niveau
   * @returns true si level up
   */
  gainExperience(amount: number): boolean {
    if (this.status === 'mort') return false
    this.experience += amount

    const xpNeeded = this.targetXpForNextLevel()
    if (this.experience >= xpNeeded) {
      this.experience -= xpNeeded
      this.level++
      this.statPoints++ // Donne un point à dépenser/choisir (logique handle par UI)
      return true
    }
    return false
  }

  targetXpForNextLevel(): number {
    return Math.floor(100 * Math.pow(1.5, this.level - 1))
  }

  /**
   * Applique une amélioration de stat
   */
  upgradeStat(statName: keyof MobStats, amount: number): void {
    this.stats[statName] += amount
    // Si on augmente la vitalité, on soigne du montant de PV gagné par l'augmentation (pour pas être "blessé" par le level up)
    if (statName === 'vitalite') {
      this.vie += (amount * 5)
    }
  }

  /**
   * Génère 3 choix d'amélioration aléatoires pour un level up
   */
  generateUpgradeChoices(): any[] {
    const choices: any[] = []

    // Choix 1: Stat aléatoire
    const stats: Array<keyof MobStats> = ['force', 'vitalite', 'vitesse', 'agilite']
    const randomStat = stats[Math.floor(Math.random() * stats.length)]
    const statAmount = 2 + Math.floor(Math.random() * 2) // 2 ou 3
    const statLabels = { force: 'FOR', vitalite: 'VIT', vitesse: 'SPD', agilite: 'AGI' }
    choices.push({
      type: 'stat',
      stat: randomStat,
      amount: statAmount,
      label: `+${statAmount} ${statLabels[randomStat]}`
    })

    // Choix 2: Arme
    const weapons = ['Épée Rouillée', 'Bâton Noueux', 'Hache Ébréchée', 'Marteau Lourd', 'Dague Acérée']
    const randomWeapon = weapons[Math.floor(Math.random() * weapons.length)]
    choices.push({
      type: 'weapon',
      name: randomWeapon,
      label: randomWeapon
    })

    // Choix 3: Trait (si pas déjà possédé)
    const availableTraits = POSSIBLE_TRAITS.filter(t => !this.traits.includes(t))
    if (availableTraits.length > 0) {
      const randomTrait = availableTraits[Math.floor(Math.random() * availableTraits.length)]
      choices.push({
        type: 'trait',
        name: randomTrait,
        label: randomTrait,
        description: `Nouveau trait: ${randomTrait}`
      })
    } else {
      // Si tous les traits sont déjà acquis, donner un autre choix de stat
      const altStat = stats[Math.floor(Math.random() * stats.length)]
      const altAmount = 2 + Math.floor(Math.random() * 2)
      const altLabels = { force: 'FOR', vitalite: 'VIT', vitesse: 'SPD', agilite: 'AGI' }
      choices.push({
        type: 'stat',
        stat: altStat,
        amount: altAmount,
        label: `+${altAmount} ${altLabels[altStat]}`
      })
    }

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
      // Pour l'instant, juste logger (pas de système d'armes complet)
      console.log(`[Mob] ${this.nom} a obtenu: ${choice.name}`)
    } else if (choice.type === 'trait') {
      if (!this.traits.includes(choice.name)) {
        this.traits.push(choice.name)
        this.statPoints--
      }
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
      inSquad: this.inSquad
    }
  }

  /**
   * Crée un mob à partir de données sérialisées
   */
  static fromJSON(data: MobData): Mob {
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
      data.inSquad, // Pass explicitly
      data.level || 1,
      data.experience || 0,
      data.statPoints || 0
    )
    // Force full heal / revive logic on load (Hub = Safe Zone)
    mob.vie = mob.getMaxHP()
    mob.energie = 100
    mob.status = 'vivant'
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
    return this.mobs.delete(id)
  }

  /**
   * Récupère un mob par son ID
   */
  getMobById(id: string): MobData | null {
    const mob = this.mobs.get(id)
    return mob ? mob.toJSON() : null
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
  updateMobSkin(id: string, type: 'hat' | 'bottom', value: string): MobActionResult {
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
