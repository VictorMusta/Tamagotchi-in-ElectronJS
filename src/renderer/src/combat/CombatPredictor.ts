import { MobData } from '../../../shared/types'
import { WEAPON_REGISTRY } from '../../../shared/WeaponRegistry'

interface InternalMob extends MobData {
  currentWeapon?: string
  tempInventory: string[]
}

export class CombatPredictor {
  /**
   * PREDICTIVE ORACLE ALGORITHM: Monte Carlo Simulation
   * 
   * This method runs N headless "fast-forward" simulations of a combat.
   * Unlike the real-time UI combat, this simulation is purely logical and executes
   * in milliseconds. It clones the fighters' state and iterates through 
   * speed-based energy generation turns.
   * 
   * @param trials Number of simulations (default 200 for a balance of speed and precision)
   * @returns Win percentage (0-100)
   */
  public predict(f1: MobData, f2: MobData, trials: number = 200): number {
    let wins = 0
    for (let i = 0; i < trials; i++) {
      if (this.simulateCombat(f1, f2)) {
        wins++
      }
    }
    // Result is the statistical average of simulated outcomes
    return (wins / trials) * 100
  }

  private simulateCombat(p1: MobData, p2: MobData): boolean {
    // Clone fighters for stateful simulation
    const f1: InternalMob = { 
      ...JSON.parse(JSON.stringify(p1)), 
      currentWeapon: undefined,
      tempInventory: [...(p1.weapons || [])]
    }
    const f2: InternalMob = { 
      ...JSON.parse(JSON.stringify(p2)), 
      currentWeapon: undefined,
      tempInventory: [...(p2.weapons || [])]
    }

    let energy1 = 0
    let energy2 = 0
    let mag1 = 0, mag2 = 0
    let ess1 = 0, ess2 = 0
    let spr1 = 0, spr2 = 0
    let stun1 = false, stun2 = false
    let blind1 = 0, blind2 = 0

    const MAX_ENERGY = 100

    // Loop until someone dies (max actions to prevent infinite loops)
    let safety = 0
    while (f1.vie > 0 && f2.vie > 0 && safety < 1000) {
      safety++
      
      // Energy Accel
      energy1 += this.getSpeed(f1) / 10
      energy2 += this.getSpeed(f2) / 10
      if (this.hasTrait(f1, "Appel de l'Astico-Roi")) mag1 += (this.getSpeed(f1) / 10) * 0.4
      if (this.hasTrait(f2, "Appel de l'Astico-Roi")) mag2 += (this.getSpeed(f2) / 10) * 0.4
      if (this.hasTrait(f1, "Essaim de Moucherons")) ess1 += (this.getSpeed(f1) / 10) * 1.5
      if (this.hasTrait(f2, "Essaim de Moucherons")) ess2 += (this.getSpeed(f2) / 10) * 1.5
      if (this.hasTrait(f1, "Esprit Saboteur")) spr1 += (this.getSpeed(f1) / 10) * 1.5
      if (this.hasTrait(f2, "Esprit Saboteur")) spr2 += (this.getSpeed(f2) / 10) * 1.5

      // Turn Resolution
      if (energy1 >= MAX_ENERGY) {
        if (!stun1) this.performAction(f1, f2, (v) => stun2 = v, blind1 > 0)
        else stun1 = false
        energy1 -= MAX_ENERGY
        if (blind1 > 0) blind1--
      } else if (energy2 >= MAX_ENERGY) {
        if (!stun2) this.performAction(f2, f1, (v) => stun1 = v, blind2 > 0)
        else stun2 = false
        energy2 -= MAX_ENERGY
        if (blind2 > 0) blind2--
      } else if (mag1 >= MAX_ENERGY) {
        this.applyDmg(f2, 5 + Math.random() * 5)
        mag1 -= MAX_ENERGY
      } else if (mag2 >= MAX_ENERGY) {
        this.applyDmg(f1, 5 + Math.random() * 5)
        mag2 -= MAX_ENERGY
      } else if (ess1 >= MAX_ENERGY) {
        this.applyDmg(f2, 2 + Math.random() * 2)
        if (Math.random() < 0.3) blind2++
        ess1 -= MAX_ENERGY
      } else if (ess2 >= MAX_ENERGY) {
        this.applyDmg(f1, 2 + Math.random() * 2)
        if (Math.random() < 0.3) blind1++
        ess2 -= MAX_ENERGY
      } else if (spr1 >= MAX_ENERGY) {
        this.performSpirit(f1, f2)
        spr1 -= MAX_ENERGY
      } else if (spr2 >= MAX_ENERGY) {
        this.performSpirit(f2, f1)
        spr2 -= MAX_ENERGY
      }
    }

    return f1.vie > 0
  }

  private getSpeed(mob: MobData): number {
    const maxHp = 100 + (mob.stats.vitalite * (mob.hpMultiplier || 10))
    let speed = mob.stats.vitesse
    if (mob.vie < maxHp * 0.2 && this.hasTrait(mob, 'Sprint Final')) speed *= 2
    return speed
  }

  private hasTrait(mob: MobData, trait: string): boolean {
    return (mob.traits || []).includes(trait)
  }

  private performAction(att: InternalMob, def: InternalMob, setStun: (v: boolean) => void, isBlinded: boolean) {
    // Minimalistic action logic for prediction
    let dmg = att.stats.force + Math.random() * 5
    const w = WEAPON_REGISTRY[att.currentWeapon || '']
    if (w) dmg += w.damageBonus

    const crit = this.hasTrait(att, 'Coup Critique') ? 0.33 : 0.1
    if (Math.random() < crit) { dmg *= 2 }

    // Dodge
    const dodge = 0.1 + (def.stats.agilite - (att.stats.agilite - (isBlinded ? 5 : 0))) * 0.02
    if (Math.random() < Math.max(0.05, dodge)) return

    // Apply
    this.applyDmg(def, dmg)
    
    // Weapon stun
    if (w?.effects?.stunChance && Math.random() < w.effects.stunChance) setStun(true)
  }

  private applyDmg(def: MobData, dmg: number) {
    let final = dmg
    let red = this.hasTrait(def, 'Peau de Cuir') ? 0.1 : 0
    final = Math.floor(final * (1 - red))
    
    def.vie -= final
  }

  private performSpirit(_own: InternalMob, tar: InternalMob) {
    if (Math.random() < 0.5 && tar.currentWeapon) tar.currentWeapon = undefined
    else if (tar.tempInventory.length > 0) {
      const idx = Math.floor(Math.random() * tar.tempInventory.length)
      tar.currentWeapon = tar.tempInventory[idx]
    }
  }
}
