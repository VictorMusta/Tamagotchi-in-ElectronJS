import { MobData } from '../../../shared/types'
import { WEAPON_REGISTRY } from '../../../shared/WeaponRegistry'

interface InternalMob extends MobData {
  currentWeapon?: string
  tempInventory: string[]
}

export class CombatPredictor {
  /**
   * Predicts the win probability for fighter 1 against fighter 2.
   * Runs multiple headless simulations.
   */
  public predict(f1: MobData, f2: MobData, trials: number = 200): number {
    let wins = 0
    for (let i = 0; i < trials; i++) {
      if (this.simulateCombat(f1, f2)) {
        wins++
      }
    }
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

    let guard1 = this.hasTrait(f1, 'Gardien de Racine') ? Math.floor((100 + f1.stats.vitalite * 10) * 0.5) : 0
    let guard2 = this.hasTrait(f2, 'Gardien de Racine') ? Math.floor((100 + f2.stats.vitalite * 10) * 0.5) : 0
    
    let hits1 = 0, hits2 = 0
    let brz1 = false, brz2 = false
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
        if (!stun1) this.performAction(f1, f2, brz1, (v) => brz1 = v, (v) => stun2 = v, (v) => guard2 = v, () => blind2++, blind1 > 0)
        else stun1 = false
        energy1 -= MAX_ENERGY
        if (blind1 > 0) blind1--
      } else if (energy2 >= MAX_ENERGY) {
        if (!stun2) this.performAction(f2, f1, brz2, (v) => brz2 = v, (v) => stun1 = v, (v) => guard1 = v, () => blind1++, blind2 > 0)
        else stun2 = false
        energy2 -= MAX_ENERGY
        if (blind2 > 0) blind2--
      } else if (mag1 >= MAX_ENERGY) {
        this.applyDmg(f1, f2, 5 + Math.random() * 5, false, (v) => guard2 = v)
        mag1 -= MAX_ENERGY
      } else if (mag2 >= MAX_ENERGY) {
        this.applyDmg(f2, f1, 5 + Math.random() * 5, false, (v) => guard1 = v)
        mag2 -= MAX_ENERGY
      } else if (ess1 >= MAX_ENERGY) {
        this.applyDmg(f1, f2, 2 + Math.random() * 2, false, (v) => guard2 = v)
        if (Math.random() < 0.3) blind2++
        ess1 -= MAX_ENERGY
      } else if (ess2 >= MAX_ENERGY) {
        this.applyDmg(f2, f1, 2 + Math.random() * 2, false, (v) => guard1 = v)
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

  private performAction(att: InternalMob, def: InternalMob, isBrz: boolean, setBrz: (v: boolean) => void, setStun: (v: boolean) => void, setGuard: (v: number) => void, addBlind: () => void, isBlinded: boolean) {
    // Minimalistic action logic for prediction
    let dmg = att.stats.force + Math.random() * 5
    const w = WEAPON_REGISTRY[att.currentWeapon || '']
    if (w) dmg += w.damageBonus

    const crit = this.hasTrait(att, 'Coup Critique') ? 0.33 : 0.1
    let isCrit = false
    if (Math.random() < crit) { dmg *= 2; isCrit = true }

    // Dodge
    const dodge = 0.1 + (def.stats.agilite - (att.stats.agilite - (isBlinded ? 5 : 0))) * 0.02
    if (Math.random() < Math.max(0.05, dodge)) return

    // Apply
    this.applyDmg(att, def, dmg, isCrit, setGuard)
    
    // Weapon stun
    if (w?.effects?.stunChance && Math.random() < w.effects.stunChance) setStun(true)
  }

  private applyDmg(att: MobData, def: MobData, dmg: number, isCrit: boolean, setGuard: (v: number) => void) {
    let final = dmg
    let red = this.hasTrait(def, 'Peau de Cuir') ? 0.1 : 0
    final = Math.floor(final * (1 - red))
    
    // Simplification for guard
    def.vie -= final
  }

  private performSpirit(own: InternalMob, tar: InternalMob) {
    if (Math.random() < 0.5 && tar.currentWeapon) tar.currentWeapon = undefined
    else if (tar.tempInventory.length > 0) {
      const idx = Math.floor(Math.random() * tar.tempInventory.length)
      tar.currentWeapon = tar.tempInventory[idx]
    }
  }
}
