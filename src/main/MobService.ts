import { randomUUID } from 'crypto'
import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

import { MobData, MobActionResult, MobListResult, SaveLoadResult, MobStatus, MobStats, MobSkin, CombatStats } from '../shared/types'

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
  faim: number
  status: MobStatus
  // Nouvelles propriétés pour le combat et la customisation
  stats: MobStats
  level: number
  experience: number
  statPoints: number
  traits: string[]
  skin: MobSkin
  combatProgress: CombatStats

  constructor(
    nom: string,
    imageUrl: string,
    vie: number = 100,
    energie: number = 100,
    faim: number = 0,
    id?: string,
    stats?: MobStats,
    traits?: string[],
    skin?: MobSkin,
    combatProgress?: CombatStats,
    level: number = 1,
    experience: number = 0,
    statPoints: number = 0
  ) {
    this.id = id || randomUUID()
    this.nom = nom
    this.imageUrl = imageUrl
    this.vie = vie
    this.energie = energie
    this.faim = faim
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
    // Si c'est un nouveau mob (pas chargé via ID), on met la vie au max
    if (!id) {
      this.vie = maxHP
    }

    // Initialisation des traits (3 aléatoires si non fournis)
    this.traits = traits || this.generateRandomTraits()

    // Initialisation du skin
    this.skin = skin || {
      hat: 'none',
      bottom: 'none'
    }

    // Initialisation de la progression
    this.combatProgress = combatProgress || {
      wins: 0,
      losses: 0,
      winStreak: 0
    }
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
   * Nourrit le mob (diminue la faim)
   * @returns true si la nourriture a été appliquée
   */
  feed(amount: number): boolean {
    if (this.status === 'mort') return false
    this.faim = Math.max(0, this.faim - amount)
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
    this.faim = 50
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
   * Modifie la faim du mob
   */
  setFaim(amount: number): void {
    this.faim = Math.max(0, Math.min(100, amount))
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
   * Sérialise le mob en objet JSON
   */
  toJSON(): MobData {
    return {
      id: this.id,
      nom: this.nom,
      imageUrl: this.imageUrl,
      vie: this.vie,
      energie: this.energie,
      faim: this.faim,
      status: this.status,
      stats: this.stats,
      level: this.level,
      experience: this.experience,
      statPoints: this.statPoints,
      traits: this.traits,
      skin: this.skin,
      combatProgress: this.combatProgress
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
      data.faim,
      data.id,
      // Utilisation explicite de undefined pour déclencher les valeurs par défaut du constructeur
      data.stats || undefined,
      data.traits || undefined,
      data.skin || undefined,
      data.combatProgress || undefined,
      data.level || 1,
      data.experience || 0,
      data.statPoints || 0
    )
    mob.status = data.status
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
    const mob = new Mob(uniqueName, imageUrl)
    this.mobs.set(mob.id, mob)
    return mob.toJSON()
  }

  /**
   * Supprime un mob par son ID
   */
  deleteMob(id: string): boolean {
    const mob = this.mobs.get(id)
    if (!mob) return false
    if (mob.status !== 'mort') return false
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
   * Inflige des dégâts à un mob
   */
  damageMob(id: string, amount: number): MobActionResult {
    const mob = this.mobs.get(id)
    if (!mob) {
      return { success: false, error: 'Mob non trouvé' }
    }
    const justDied = mob.takeDamage(amount)

    // XP Gain (Grinding)
    if (!justDied) {
      mob.gainExperience(5) // 5 XP par coup reçu/donné (interaction)
    }

    return { success: true, mob: mob.toJSON(), error: justDied ? 'died' : undefined }
  }

  /**
   * Soigne un mob
   */
  healMob(id: string, amount: number): MobActionResult {
    const mob = this.mobs.get(id)
    if (!mob) {
      return { success: false, error: 'Mob non trouvé' }
    }
    const healed = mob.heal(amount)
    if (!healed) {
      return { success: false, error: 'Le mob est mort', mob: mob.toJSON(), changed: false }
    }
    return { success: true, mob: mob.toJSON(), changed: true }
  }

  /**
   * Nourrit un mob
   */
  feedMob(id: string, amount: number): MobActionResult {
    const mob = this.mobs.get(id)
    if (!mob) {
      return { success: false, error: 'Mob non trouvé' }
    }
    const fed = mob.feed(amount)
    if (!fed) {
      return { success: false, error: 'Le mob est mort', mob: mob.toJSON(), changed: false }
    }
    return { success: true, mob: mob.toJSON(), changed: true }
  }

  /**
   * Réanime un mob
   */
  reviveMob(id: string): MobActionResult {
    const mob = this.mobs.get(id)
    if (!mob) {
      return { success: false, error: 'Mob non trouvé' }
    }
    const revived = mob.revive()
    if (!revived) {
      return { success: false, error: 'Le mob est déjà vivant', mob: mob.toJSON(), changed: false }
    }
    return { success: true, mob: mob.toJSON(), changed: true }
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
  processCombatResult(winnerData: MobData, loserData: MobData): { winner: MobData, reward?: string } {
    const winner = this.mobs.get(winnerData.id)
    const loser = this.mobs.get(loserData.id)

    if (loser) {
      // Mettre à jour avec les stats réelles post-combat (mort ou pas)
      loser.vie = loserData.vie
      loser.energie = loserData.energie
      loser.updateStatus()

      // Si le loser vient d'un "KO" du moteur de combat, il devrait être mort ici.
    }

    let reward: string | undefined
    if (winner) {
      // Mettre à jour le vainqueur aussi (il a perdu de la vie !)
      winner.vie = winnerData.vie
      winner.energie = winnerData.energie
      winner.updateStatus()

      winner.combatProgress.wins++
      winner.combatProgress.winStreak++

      // XP GAIN POUR VICTOIRE
      const leveledUp = winner.gainExperience(50) // 50 XP pour une victoire
      if (leveledUp) {
        // Logique de notification de level up à gérer (pour l'instant implicite)
      }

      if (winner.combatProgress.winStreak >= 5) {
        reward = 'Fiole de Réanimation'
        winner.combatProgress.winStreak = 0 // Reset après récompense
      }
    }

    return {
      winner: winner ? winner.toJSON() : winnerData,
      reward
    }
  }
}

// Export du singleton
export const MobManager = new MobManagerClass()
