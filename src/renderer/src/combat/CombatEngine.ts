import { MobData } from '../../../shared/types'
import { WEAPON_REGISTRY } from '../../../shared/WeaponRegistry'

// Extended interface for internal combat state (tracking currently held weapon)
interface CombatMob extends MobData {
    weapon?: string
}

export type CombatEvent =
    | { type: 'tick', fighter1Energy: number, fighter2Energy: number, maggot1Energy?: number, maggot2Energy?: number }
    | { type: 'attack', attackerId: string, targetId: string, damage: number, isCritical: boolean, targetCurrentHp: number, targetMaxHp: number, weapon?: string, visual?: 'berzerk' | 'normal' }
    | { type: 'dodge', attackerId: string, targetId: string, targetCurrentHp: number }
    | { type: 'maggot_attack', attackerId: string, targetId: string, damage: number, targetCurrentHp: number, targetMaxHp: number }
    | { type: 'counter_attack', attackerId: string, targetId: string, damage: number, targetCurrentHp: number, targetMaxHp: number, weapon?: string }
    | { type: 'weapon_steal', thiefId: string, victimId: string, weapon: string }
    | { type: 'log', message: string }
    | { type: 'state_change', id: string, state: 'berzerk' | 'stun' | 'normal', value?: boolean }
    | { type: 'weapon_change', id: string, weapon: string | undefined }
    | { type: 'death', deadId: string, winnerId: string }

export class CombatEngine {
    private f1: CombatMob
    private f2: CombatMob

    private energy1: number = 0
    private energy2: number = 0
    private maggotEnergy1: number = 0
    private maggotEnergy2: number = 0

    // Combat State
    private consecutiveHitsTaken1: number = 0
    private consecutiveHitsTaken2: number = 0
    
    private isBerzerk1: boolean = false
    private isBerzerk2: boolean = false

    private isStunned1: boolean = false
    private isStunned2: boolean = false

    private stolenWeapon1: string | undefined
    private stolenWeapon2: string | undefined

    private readonly MAX_ENERGY = 100

    private isRunning: boolean = false
    private onEvent: (event: CombatEvent) => void

    private f1Inventory: string[] = []
    private f2Inventory: string[] = []

    constructor(f1: MobData, f2: MobData, onEvent: (event: CombatEvent) => void) {
        this.f1 = JSON.parse(JSON.stringify(f1)) as CombatMob
        this.f2 = JSON.parse(JSON.stringify(f2)) as CombatMob
        this.onEvent = onEvent

        // "Sheathe" weapons at start (Populate inventory from MobData.weapons)
        this.f1Inventory = [...(this.f1.weapons || [])]
        this.f1.weapon = undefined

        this.f2Inventory = [...(this.f2.weapons || [])]
        this.f2.weapon = undefined
    }

    private speedMultiplier: number = 1

    setSpeed(speed: number): void {
        this.speedMultiplier = speed
    }

    async start(): Promise<{ winner: MobData, loser: MobData }> {
        this.isRunning = true
        this.onEvent({ type: 'log', message: `Le combat commence : ${this.f1.nom} vs ${this.f2.nom} !` })

        await new Promise(resolve => setTimeout(resolve, 1000 / this.speedMultiplier))

        while (this.isRunning) {
            // 1. Tick
            let actionReady = false
            while (!actionReady) {
                // Main Speed Logic (Sprint Final implemented here)
                this.energy1 += this.getSpeed(this.f1, this.f1.id === this.f1.id ? this.f1.vie : 0) // Bug ref fix below
                this.energy2 += this.getSpeed(this.f2, 0) // Helper needs refactor

                // Maggot Speed (Appel de l'Astico-Roi)
                if (this.hasTrait(this.f1, 'Appel de l\'Astico-Roi')) {
                    this.maggotEnergy1 += this.getSpeed(this.f1) * 0.8 // Maggot is slightly slower
                }
                if (this.hasTrait(this.f2, 'Appel de l\'Astico-Roi')) {
                    this.maggotEnergy2 += this.getSpeed(this.f2) * 0.8
                }

                if (this.energy1 >= this.MAX_ENERGY || this.energy2 >= this.MAX_ENERGY || 
                    this.maggotEnergy1 >= this.MAX_ENERGY || this.maggotEnergy2 >= this.MAX_ENERGY) {
                    actionReady = true
                }
            }

            this.onEvent({ 
                type: 'tick', 
                fighter1Energy: this.energy1, 
                fighter2Energy: this.energy2,
                maggot1Energy: this.maggotEnergy1,
                maggot2Energy: this.maggotEnergy2
            })

            // 2. Action Resolution
            // Order: P1 > P2 > Maggot1 > Maggot2 (Simplification)
            if (this.energy1 >= this.MAX_ENERGY) {
                if (this.isStunned1) {
                    this.onEvent({ type: 'log', message: `${this.f1.nom} est étourdi et passe son tour !` })
                    this.onEvent({ type: 'state_change', id: this.f1.id, state: 'stun', value: false }) // Remove stun visual
                    this.isStunned1 = false
                } else {
                    await this.performAction(this.f1, this.f2)
                }
                this.energy1 -= this.MAX_ENERGY
            }
            else if (this.energy2 >= this.MAX_ENERGY) {
                if (this.isStunned2) {
                    this.onEvent({ type: 'log', message: `${this.f2.nom} est étourdi et passe son tour !` })
                    this.onEvent({ type: 'state_change', id: this.f2.id, state: 'stun', value: false })
                    this.isStunned2 = false
                } else {
                    await this.performAction(this.f2, this.f1)
                }
                this.energy2 -= this.MAX_ENERGY
            }
            else if (this.maggotEnergy1 >= this.MAX_ENERGY) {
                await this.performMaggotAction(this.f1, this.f2)
                this.maggotEnergy1 -= this.MAX_ENERGY
            }
            else if (this.maggotEnergy2 >= this.MAX_ENERGY) {
                await this.performMaggotAction(this.f2, this.f1)
                this.maggotEnergy2 -= this.MAX_ENERGY
            }

            // 3. Rhythm
            await new Promise(resolve => setTimeout(resolve, 1000 / this.speedMultiplier))

            // 4. Death Check
            if (this.f1.vie <= 0 || this.f2.vie <= 0) {
                this.isRunning = false
                const dead = this.f1.vie <= 0 ? this.f1 : this.f2
                const winner = this.f1.vie <= 0 ? this.f2 : this.f1
                this.onEvent({ type: 'log', message: `${dead.nom} est K.O. !` })
                this.onEvent({ type: 'death', deadId: dead.id, winnerId: winner.id })
                return { winner, loser: dead }
            }
        }
        return { winner: this.f1, loser: this.f2 } // Should not reach
    }

    // --- Core Logic ---

    // Sprint Final Implementation
    private getSpeed(mob: MobData, currentHpOverride?: number): number {
        const hp = currentHpOverride !== undefined ? currentHpOverride : mob.vie
        const maxHp = 100 + (mob.stats.vitalite * 5)
        const isLowHp = hp < (maxHp * 0.2)
        
        let speed = mob.stats.vitesse
        if (isLowHp && this.hasTrait(mob, 'Sprint Final')) {
            speed *= 2
        }
        return speed
    }

    private hasTrait(mob: MobData, trait: string): boolean {
        return mob.traits.includes(trait)
    }

    private getInventory(mobId: string): string[] {
        return mobId === this.f1.id ? this.f1Inventory : this.f2Inventory
    }

    // Removed clearInventory as we now manage array splicing or just don't return it to stock

    private async performAction(attacker: CombatMob, defender: CombatMob, isCounter: boolean = false): Promise<void> {
        // --- WEAPON DYNAMICS ---
        
        // 1. Draw Weapon (if unarmed but has stock)
        const inventory = this.getInventory(attacker.id)
        if (!attacker.weapon && inventory.length > 0) {
             if (Math.random() < 0.3) {
                 // Pick random weapon from stock
                 const index = Math.floor(Math.random() * inventory.length)
                 const drawnWeapon = inventory[index]
                 
                 // Remove from stock (it's in hand now)
                 inventory.splice(index, 1)
                 
                 attacker.weapon = drawnWeapon
                 this.onEvent({ type: 'log', message: `${attacker.nom} dégaine : ${attacker.weapon} !` })
             }
        }

        // 2. Weapon Throw (if armed)
        if (attacker.weapon && !isCounter) {
             if (Math.random() < 0.2) {
                 await this.throwWeapon(attacker, defender)
                 return // Turn ends after throw
             }
        }

        // --- RANGE ADVANTAGE CHECK ---
        // If Short vs Long -> Chance to get countered immediately and loose turn
        const attWeapon = WEAPON_REGISTRY[attacker.weapon || '']
        const defWeapon = WEAPON_REGISTRY[defender.weapon || '']

        if (!isCounter && attWeapon?.type === 'short' && defWeapon?.type === 'long') {
             const counterChance = defWeapon.effects?.counterChance || 0.25
             if (Math.random() < counterChance) {
                 this.onEvent({ type: 'log', message: `${defender.nom} garde ${attacker.nom} à distance avec son allonge !` })
                 this.triggerCounterAttack(defender, attacker)
                 return // Attack Cancelled
             }
        }

        // Berzerk Check (If attacker is Berzerk, they hit 3 times)
        const attackCount = (this.isBerzerk(attacker) && !isCounter) ? 3 : 1
        
        for (let i = 0; i < attackCount; i++) {
            if (i > 0) await new Promise(r => setTimeout(r, 200)) // Quick burst delay

            // Hit Calculation
            const hitResult = this.calculateHit(attacker, defender)
            
            if (hitResult.isHit) {
                // Apply Damage
                this.applyDamage(attacker, defender, hitResult.damage, hitResult.isCritical)

                // Main de Dentelle (Steal Weapon)
                if (this.hasTrait(attacker, 'Main de Dentelle') && defender.weapon && !this.getStolenWeapon(attacker.id)) {
                    this.stealWeapon(attacker, defender)
                }

                // Berzerk Logic (Reset consecutive hits on successful attack? No, spec says "takes 3 hits")
                await this.handleOnHitEvents(defender, attacker)

                // --- WEAPON DROP CHECK (Slippery Hands) ---
                if (attacker.weapon) {
                    const currentWeapon = WEAPON_REGISTRY[attacker.weapon]
                    let dropChance = 0
                    if (currentWeapon) {
                        if (currentWeapon.type === 'short') dropChance = 0.05
                        else if (currentWeapon.type === 'long') dropChance = 0.15
                        else if (currentWeapon.type === 'shield') dropChance = 0.10
                    }
                    
                    if (Math.random() < dropChance) {
                        this.onEvent({ type: 'log', message: `${attacker.nom} laisse glisser son arme (${attacker.weapon}) !` })
                        attacker.weapon = undefined
                        // Weapon is lost (removed from inventory on draw, and now lost from hand)
                    }
                }

            } else {
                // Dodge
                this.onEvent({ 
                    type: 'dodge', 
                    attackerId: attacker.id, 
                    targetId: defender.id,
                    targetCurrentHp: defender.vie
                })
                this.onEvent({ type: 'log', message: `${defender.nom} esquive !` })
                
                // Contre-attaque works even on dodge? Spec: "when he is hit (even if he dodges)" -> Yes
                await this.handleOnHitEvents(defender, attacker) 
            }
        }
    }

    private async throwWeapon(attacker: CombatMob, defender: CombatMob): Promise<void> {
        const weaponName = attacker.weapon
        if (!weaponName) return

        this.onEvent({ type: 'log', message: `${attacker.nom} lance son arme (${weaponName}) sur ${defender.nom} !` })
        
        // Calculate Damage (Force + Weapon Bonus) * 1.05
        let damage = attacker.stats.force
        const weapon = WEAPON_REGISTRY[weaponName]
        if (weapon) damage += weapon.damageBonus
        
        damage = Math.floor(damage * 1.05) // 5% Bonus
        
        // Apply Damage (Can it be dodged? Assuming yes for consistency, but maybe untraditional throw is harder to dodge?)
        // Let's use calculateHit logic but force hit true for simplicity or assume high accuracy?
        // Let's use standard hit calc
        const hitResult = this.calculateHit(attacker, defender)
        
        if (hitResult.isHit) {
            // Override damage with throw damage
            this.applyDamage(attacker, defender, damage, hitResult.isCritical)
            await this.handleOnHitEvents(defender, attacker)
        } else {
             this.onEvent({ 
                type: 'dodge', 
                attackerId: attacker.id, 
                targetId: defender.id,
                targetCurrentHp: defender.vie
            })
            this.onEvent({ type: 'log', message: `${defender.nom} esquive le projectile !` })
        }
        
        // Lose weapon regardless of hit/miss
        attacker.weapon = undefined
        this.onEvent({ type: 'weapon_change', id: attacker.id, weapon: undefined })
        // Removed from inventory on draw, so just clearing hand is enough
    }

    private async performMaggotAction(owner: CombatMob, target: CombatMob): Promise<void> {
        const damage = 5 + Math.floor(Math.random() * 5)
        const actualDamage = this.calculateDamageReduction(target, damage)
        target.vie -= actualDamage
        
        const maxHp = 100 + (target.stats.vitalite * 5)
        
        this.onEvent({
            type: 'maggot_attack',
            attackerId: owner.id,
            targetId: target.id,
            damage: actualDamage,
            targetCurrentHp: target.vie,
            targetMaxHp: maxHp
        })
        
        await this.handleOnHitEvents(target, owner) // Maggot hits count for Berzerk/Counter? Spec says "of any source". Yes.
    }

    private calculateHit(attacker: CombatMob, defender: CombatMob): { isHit: boolean, damage: number, isCritical: boolean } {
         const dodgeChance = 0.1 + (defender.stats.agilite - attacker.stats.agilite) * 0.02
         if (Math.random() < Math.max(0.05, dodgeChance)) {
             return { isHit: false, damage: 0, isCritical: false }
         }

         let damage = attacker.stats.force + Math.floor(Math.random() * 5)
         
         // Weapon Damage Bonus
         const weapon = WEAPON_REGISTRY[attacker.weapon || '']
         if (weapon) damage += weapon.damageBonus

         const critChance = this.hasTrait(attacker, 'Coup Critique') ? 0.33 : 0.1
         let isCritical = false
         if (Math.random() < critChance) {
             damage *= 2
             isCritical = true
         }
         
         // Apply Reductions (Peau de Cuir + SHIELD)
         damage = this.calculateDamageReduction(defender, damage)

         return { isHit: true, damage, isCritical }
    }

    private calculateDamageReduction(defender: CombatMob, incomeDamage: number): number {
        let reduction = 0
        if (this.hasTrait(defender, 'Peau de Cuir')) {
            reduction += 0.1
        }
        
        // Shield Block Logic
        const weapon = WEAPON_REGISTRY[defender.weapon || '']
        if (weapon?.type === 'shield' && weapon.effects?.blockChance) {
            if (Math.random() < weapon.effects.blockChance) {
                 reduction += 0.5 // 50% reduction on block
                 this.onEvent({ type: 'log', message: `${defender.nom} BLOQUE avec ${weapon.name} !` })
            }
        }

        return Math.floor(incomeDamage * (1 - reduction))
    }

    private applyDamage(attacker: CombatMob, defender: CombatMob, damage: number, isCritical: boolean) {
        defender.vie -= damage
        const maxHp = 100 + (defender.stats.vitalite * 5)
        
        const isAttackerBerzerk = this.isBerzerk(attacker)

        this.onEvent({
            type: 'attack',
            attackerId: attacker.id,
            targetId: defender.id,
            damage,
            isCritical,
            targetCurrentHp: defender.vie,
            targetMaxHp: maxHp,
            visual: isAttackerBerzerk ? 'berzerk' : 'normal',
            weapon: attacker.weapon
        })
        this.onEvent({ type: 'log', message: `${attacker.nom} inflige ${damage} dégâts !` })

        // Stun Logic (Capsule)
        const weapon = WEAPON_REGISTRY[attacker.weapon || '']
        if (weapon?.effects?.stunChance && !isAttackerBerzerk) { // No perma-stun in berzerk for balance? allow for now
             if (Math.random() < weapon.effects.stunChance) {
                 this.applyStun(defender)
             }
        }
    }
    
    private applyStun(target: CombatMob) {
        if (target.id === this.f1.id) this.isStunned1 = true
        else this.isStunned2 = true
        
        this.onEvent({ type: 'state_change', id: target.id, state: 'stun', value: true })
        this.onEvent({ type: 'log', message: `${target.nom} est ÉTOURDI !` })
    }

    // --- Reaction Logic ---

    private async handleOnHitEvents(victim: CombatMob, source: CombatMob) {
        // Track stats for Berzerk
        if (this.hasTrait(victim, 'Berzerk')) {
            this.handleBerzerkStack(victim)
        }

        // COntre-Attaque
        if (this.hasTrait(victim, 'Contre-attaque')) {
            // Reduced to 10% because it triggers per HIT (so 3x vs Berzerk = ~27% chance)
            if (Math.random() < 0.10) {
                 await this.triggerCounterAttack(victim, source)
            }
        }
    }

    private handleBerzerkStack(mob: CombatMob) {
        if (mob.id === this.f1.id) {
            this.consecutiveHitsTaken1++
            this.consecutiveHitsTaken2 = 0 // Reset other? No, independent.
            if (this.consecutiveHitsTaken1 >= 3 && !this.isBerzerk1) {
                this.isBerzerk1 = true
                this.onEvent({ type: 'state_change', id: mob.id, state: 'berzerk', value: true })
                this.onEvent({ type: 'log', message: `${mob.nom} ENTRÉE EN BERZERK !` })
            }
        } else {
            this.consecutiveHitsTaken2++
            this.consecutiveHitsTaken1 = 0 // Hmm. Attacking resets stack?
            if (this.consecutiveHitsTaken2 >= 3 && !this.isBerzerk2) {
                this.isBerzerk2 = true
                this.onEvent({ type: 'state_change', id: mob.id, state: 'berzerk', value: true })
                this.onEvent({ type: 'log', message: `${mob.nom} ENTRÉE EN BERZERK !` })
            }
        }
    }

    private async triggerCounterAttack(attacker: CombatMob, target: CombatMob) {
         // Wait for enemy attack animation to finish (approx 500ms base, scaled by speed)
         await new Promise(resolve => setTimeout(resolve, 600 / this.speedMultiplier))

         // Free hit, doesn't consume energy.
         const damage = Math.floor(attacker.stats.force * 0.7) // Slightly weaker? or full? Spec says "frapper gratuitement". Assuming normal hit.
         const reduced = this.calculateDamageReduction(target, damage)
         target.vie -= reduced
         const maxHp = 100 + (target.stats.vitalite * 5)

         this.onEvent({
             type: 'counter_attack',
             attackerId: attacker.id,
             targetId: target.id,
             damage: reduced,
             targetCurrentHp: target.vie,
             targetMaxHp: maxHp,
             weapon: attacker.weapon
         })
         this.onEvent({ type: 'log', message: `${attacker.nom} CONTRE-ATTAQUE !` })
    }

    private stealWeapon(thief: CombatMob, victim: CombatMob) {
        // Transfer weapon string temporarily
        const weapon = victim.weapon
        if (!weapon) return

        if (thief.id === this.f1.id) this.stolenWeapon1 = weapon
        else this.stolenWeapon2 = weapon

        // In a real robust system we'd remove it from victim, but for now visual/log
        this.onEvent({ type: 'weapon_steal', thiefId: thief.id, victimId: victim.id, weapon })
        this.onEvent({ type: 'log', message: `${thief.nom} vole l'arme (${weapon}) de ${victim.nom} !` })
    }

    // Helper State Access
    private isBerzerk(mob: CombatMob): boolean {
        return mob.id === this.f1.id ? this.isBerzerk1 : this.isBerzerk2
    }
    
    private getStolenWeapon(mobId: string): string | undefined {
        return mobId === this.f1.id ? this.stolenWeapon1 : this.stolenWeapon2
    }
}
