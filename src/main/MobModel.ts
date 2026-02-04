import { randomUUID } from 'crypto'
import { MobData, MobStatus, MobStats, MobSkin, CombatStats } from '../shared/types'
import { WEAPON_REGISTRY } from '../shared/WeaponRegistry'

export const POSSIBLE_TRAITS = [
  'Sprint Final',
  'Peau de Cuir',
  'Contre-attaque',
  'Appel de l\'Astico-Roi',
  'Essaim de Moucherons',
  'Gardien de Racine',
  'Esprit Saboteur',
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
  hpMultiplier: number

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
    weapons?: string[],
    hpMultiplier: number = 10
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
    const maxHP = 100 + (this.stats.vitalite * (hpMultiplier !== undefined ? hpMultiplier : 10))

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

    this.hpMultiplier = hpMultiplier
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
    for (let i = 0; i < 3; i++) {
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
    return 100 + (this.stats.vitalite * this.hpMultiplier)
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

    // 1. Guaranteed Stat Upgrade
    const stats: (keyof MobStats)[] = ['force', 'vitalite', 'vitesse', 'agilite']
    const randomStat = stats[Math.floor(Math.random() * stats.length)]
    choices.push({
      type: 'stat',
      label: `+2 ${randomStat.toUpperCase()}`,
      stat: randomStat,
      amount: 2
    })

    // 2. Guaranteed Weapon Choice (if available)
    const weaponKeys = Object.keys(WEAPON_REGISTRY)
    const availableWeapons = weaponKeys.filter(w => !this.weapons.includes(w))

    if (availableWeapons.length > 0) {
      const randomWeapon = availableWeapons[Math.floor(Math.random() * availableWeapons.length)]
      choices.push({
        type: 'weapon',
        label: `Arme: ${randomWeapon}`,
        name: randomWeapon,
        description: `Ajoute ${randomWeapon} à l'arsenal.`
      })
    } else {
      // Fallback to another stat if no weapons left
      const otherStats = stats.filter(s => s !== randomStat)
      const secondStat = otherStats[Math.floor(Math.random() * otherStats.length)]
      choices.push({
        type: 'stat',
        label: `+2 ${secondStat.toUpperCase()}`,
        stat: secondStat,
        amount: 2
      })
    }

    // 3. Guaranteed Trait Choice (if available and space left)
    if (this.traits.length < 6) {
      const availableTraits = POSSIBLE_TRAITS.filter(t => !this.traits.includes(t))
      if (availableTraits.length > 0) {
        const randomTrait = availableTraits[Math.floor(Math.random() * availableTraits.length)]
        choices.push({
          type: 'trait',
          label: `Mutation: ${randomTrait}`,
          name: randomTrait,
          description: "Nouvelle mutation génétique."
        })
      }
    }

    // Final fill if we still don't have 3 choices (unlikely but safe)
    while (choices.length < 3) {
      const currentStatLabels = choices.filter(c => c.type === 'stat').map(c => c.stat)
      const remainingStats = stats.filter(s => !currentStatLabels.includes(s))
      if (remainingStats.length > 0) {
        const fillStat = remainingStats[0]
        choices.push({
          type: 'stat',
          label: `+2 ${fillStat.toUpperCase()}`,
          stat: fillStat,
          amount: 2
        })
      } else {
        break; // Should never happen with 4 stats and max 3 slots
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
        this.statPoints-- // Consommer le point de stat
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
      weapons: this.weapons,
      hpMultiplier: this.hpMultiplier
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
      migratedWeapons,
      data.hpMultiplier || 10
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
