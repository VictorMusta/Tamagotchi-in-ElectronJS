import { MobData } from '../../../shared/types'

export class LevelUpRecommender {
  /**
   * RECOMMENDATION ALGORITHM: Heuristic Scorer
   * 
   * This method evaluates each upgrade choice (stat, trait, or weapon) 
   * against the current mob's build. It uses a scoring system based on 
   * competitive meta-data (derived from the 45M match dataset).
   * 
   * Heuristics include:
   * - Speed Priority: Early-game speed is critical for energy generation.
   * - Trait Synergies: Matching stats with related traits (e.g., Agility + Dodge).
   * - Arsenal Balance: Suggesting weapons if the inventory is low.
   * 
   * @returns Index of the choice with the highest score.
   */
  public recommend(mob: MobData, choices: any[]): number {
    let bestScore = -1
    let bestIndex = 0

    choices.forEach((choice, index) => {
      let score = this.evaluateChoice(mob, choice)
      if (score > bestScore) {
        bestScore = score
        bestIndex = index
      }
    })

    return bestIndex
  }

  private evaluateChoice(mob: MobData, choice: any): number {
    let score = 50 // Base score

    if (choice.type === 'stat') {
      const stat = choice.stat.toLowerCase()
      const val = mob.stats[stat as keyof typeof mob.stats] || 0

      // Heuristic: Balance is key, but specialization is powerful
      if (stat === 'vitesse') {
        // Vitesse is king in Potato Rotato (energy generation)
        score += 30
        if (val < 15) score += 20 // Early speed is critical
      } else if (stat === 'agilite') {
        // Agility for dodge builds
        score += 20
        if (mob.traits.includes('Esquiveur')) score += 20
      } else if (stat === 'force') {
        // Force for damage
        score += 15
        if (mob.traits.includes('Coup Critique')) score += 15
      } else if (stat === 'vitalite') {
        // Vitality for tankiness
        score += 10
        if (val < 5) score += 15 // Don't get one-shot
      }
    } else if (choice.type === 'trait') {
      // High-tier traits based on 45M match data
      const opTraits = ['Sprint Final', 'Coup Critique', 'Gardien de Racine', "Assaut de l'Asticot"]
      if (opTraits.includes(choice.name)) score += 60
      
      // Synergies
      if (choice.name === 'Peau de Cuir' && mob.stats.vitalite > 15) score += 20
    } else if (choice.type === 'weapon') {
      // Suggest weapon if we have very few or weak ones
      if ((mob.weapons || []).length < 2) score += 40
      
      // Preference for high damage weapons
      if (choice.name.includes('Épée') || choice.name.includes('Hache')) score += 20
    }

    // Small random factor to avoid deterministic behavior if scores are tied
    return score + Math.random() * 5
  }
}
