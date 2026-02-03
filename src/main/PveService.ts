import { MobData, MobStats, MobSkin, PveEnemiesResult } from '../shared/types'
import { randomUUID } from 'crypto'

// Enemy name generator
const ENEMY_ADJECTIVES = ['Sauvage', 'Féroce', 'Ancien', 'Mystique', 'Sombre', 'Enragé', 'Royal', 'Maudit']
const ENEMY_NOUNS = ['Patate', 'Tubercule', 'Pomme de Terre', 'Racine', 'Légume', 'Spud']

const POSSIBLE_TRAITS = [
  'Sprint Final',
  'Peau de Cuir',
  'Contre-attaque',
  'Appel de l\'Astico-Roi',
  'Essaim de Moucherons',
  'Gardien de Racine',
  'Esprit Saboteur',
  'Berzerk'
]

class PveServiceClass {
  // Cache: mobId -> generated enemies
  private enemyCache: Map<string, MobData[]> = new Map()

  /**
   * Get or generate 3 enemies for a given mob
   */
  getEnemiesForMob(mobId: string, mobLevel: number): PveEnemiesResult {
    // Check cache first
    if (this.enemyCache.has(mobId)) {
      console.log(`[PveService] Returning cached enemies for mob ${mobId}`)
      return { success: true, enemies: this.enemyCache.get(mobId) }
    }

    // Generate 3 new enemies
    const enemies: MobData[] = []
    for (let i = 0; i < 3; i++) {
      enemies.push(this.generateEnemy(mobLevel))
    }

    // Cache them
    this.enemyCache.set(mobId, enemies)
    console.log(`[PveService] Generated and cached 3 enemies for mob ${mobId} at level ${mobLevel}`)

    return { success: true, enemies }
  }

  /**
   * Clear cache for a specific mob (after fight or selection change)
   */
  clearCacheForMob(mobId: string): void {
    this.enemyCache.delete(mobId)
    console.log(`[PveService] Cleared enemy cache for mob ${mobId}`)
  }

  /**
   * Generate a random enemy at the given level
   */
  private generateEnemy(level: number): MobData {
    const id = randomUUID()
    const name = this.generateEnemyName()

    // Generate stats: Base 55 points + 4 points per level above 1 (Player is base 60)
    const totalStatPoints = 55 + ((level - 1) * 4)
    const stats = this.distributeStats(totalStatPoints)

    // Generate traits: (level - 1) trait (max 6)
    const traitCount = Math.min(Math.max(0, level - 1), 6)
    const traits = this.pickRandomTraits(traitCount)

    // Random skin
    const skin = this.generateRandomSkin()

    const maxHP = 100 + (stats.vitalite * 5)

    const enemy: MobData = {
      id,
      nom: name,
      imageUrl: '', // Will use placeholder in UI
      vie: maxHP,
      energie: 100,
      status: 'vivant',
      stats,
      level,
      experience: 0,
      statPoints: 0,
      traits,
      skin,
      combatProgress: { wins: 0, losses: 0, winStreak: 0, tournamentWins: 0 },
      inSquad: false,
      weapons: this.generateWeaponsForLevel(level)
    }

    return enemy
  }

  private generateEnemyName(): string {
    const adj = ENEMY_ADJECTIVES[Math.floor(Math.random() * ENEMY_ADJECTIVES.length)]
    const noun = ENEMY_NOUNS[Math.floor(Math.random() * ENEMY_NOUNS.length)]
    return `${adj} ${noun}`
  }

  private distributeStats(totalPoints: number): MobStats {
    // Random distribution
    const r1 = Math.random()
    const r2 = Math.random()
    const r3 = Math.random()
    const r4 = Math.random()
    const sum = r1 + r2 + r3 + r4

    const stats: MobStats = {
      force: Math.max(5, Math.floor((r1 / sum) * totalPoints)),
      vitalite: Math.max(5, Math.floor((r2 / sum) * totalPoints)),
      vitesse: Math.max(5, Math.floor((r3 / sum) * totalPoints)),
      agilite: Math.max(5, Math.floor((r4 / sum) * totalPoints))
    }

    // Adjust remainder
    const currentSum = stats.force + stats.vitalite + stats.vitesse + stats.agilite
    const diff = totalPoints - currentSum
    if (diff > 0) {
      stats.force += diff
    }

    return stats
  }

  private pickRandomTraits(count: number): string[] {
    const available = [...POSSIBLE_TRAITS]
    const picked: string[] = []

    for (let i = 0; i < count && available.length > 0; i++) {
      const index = Math.floor(Math.random() * available.length)
      picked.push(available[index])
      available.splice(index, 1)
    }

    return picked
  }

  private generateRandomSkin(): MobSkin {
    const HATS = ['none', 'crown', 'cap', 'wizard']
    return {
      hat: HATS[Math.floor(Math.random() * HATS.length)]
    }
  }

  private generateWeaponsForLevel(level: number): string[] {
    // Enemies at higher levels may have weapons
    if (level < 3) return []

    const weaponPool = ['toothpick', 'fork', 'cutter', 'cap']
    const weaponCount = Math.min(Math.floor(level / 3), 3) // 1 weapon per 3 levels, max 3
    const weapons: string[] = []

    for (let i = 0; i < weaponCount; i++) {
      const randomWeapon = weaponPool[Math.floor(Math.random() * weaponPool.length)]
      if (!weapons.includes(randomWeapon)) {
        weapons.push(randomWeapon)
      }
    }

    return weapons
  }
}

export const PveService = new PveServiceClass()
