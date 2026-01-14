import { randomUUID } from 'crypto'
import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

import { MobData, MobActionResult, MobListResult, SaveLoadResult, MobStatus } from '../shared/types'

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

  constructor(
    nom: string,
    imageUrl: string,
    vie: number = 100,
    energie: number = 100,
    faim: number = 0,
    id?: string
  ) {
    this.id = id || randomUUID()
    this.nom = nom
    this.imageUrl = imageUrl
    this.vie = vie
    this.energie = energie
    this.faim = faim
    this.status = vie > 0 ? 'vivant' : 'mort'
  }

  /**
   * Met à jour le statut du mob en fonction de sa vie
   */
  private updateStatus(): void {
    this.status = this.vie > 0 ? 'vivant' : 'mort'
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
    this.vie = Math.min(100, this.vie + amount)
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
    this.vie = 50
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
      status: this.status
    }
  }

  /**
   * Crée un mob à partir de données sérialisées
   */
  static fromJSON(data: MobData): Mob {
    const mob = new Mob(data.nom, data.imageUrl, data.vie, data.energie, data.faim, data.id)
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
      return { success: false, error: 'Le mob est mort', mob: mob.toJSON() }
    }
    return { success: true, mob: mob.toJSON() }
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
      return { success: false, error: 'Le mob est mort', mob: mob.toJSON() }
    }
    return { success: true, mob: mob.toJSON() }
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
      return { success: false, error: 'Le mob est déjà vivant', mob: mob.toJSON() }
    }
    return { success: true, mob: mob.toJSON() }
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
}

// Export du singleton
export const MobManager = new MobManagerClass()
