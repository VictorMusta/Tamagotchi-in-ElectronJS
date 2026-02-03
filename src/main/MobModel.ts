import { randomUUID } from 'crypto'
import { MobData, MobStatus, MobStats, MobSkin, CombatStats } from '../shared/types'
import { WEAPON_REGISTRY } from '../shared/WeaponRegistry'

export const POSSIBLE_TRAITS = [
  'Sprint Final',
  'Peau de Cuir',
  'Contre-attaque',
  'Appel de l\'Astico-Roi',
  'Main de Dentelle',
  'Berzerk'
]

/**
 * Classe Mob - Contient toute la logique métier et la génération
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

  setSkin(type: 'hat', value: string): void {
      if (type === 'hat') {
          this.skin.hat = value
      }
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
      data.inSquad !== false, // Preserve saved value, default true for legacy data
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
