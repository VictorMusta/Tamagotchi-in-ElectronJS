import { MobData } from '../../../shared/types'
import { WEAPON_REGISTRY } from '../../../shared/WeaponRegistry'

// Extended interface for internal combat state (tracking currently held weapon)
interface CombatMob extends MobData {
    weapon?: string
}

export type CombatEvent =
    | { type: 'tick', fighter1Energy: number, fighter2Energy: number, maggot1Energy?: number, maggot2Energy?: number, essaim1Energy?: number, essaim2Energy?: number, spirit1Energy?: number, spirit2Energy?: number }
    | { type: 'attack', attackerId: string, targetId: string, damage: number, isCritical: boolean, targetCurrentHp: number, targetMaxHp: number, weapon?: string, visual?: 'berzerk' | 'normal' }
    | { type: 'dodge', attackerId: string, targetId: string, targetCurrentHp: number }
    | { type: 'maggot_attack', attackerId: string, targetId: string, damage: number, targetCurrentHp: number, targetMaxHp: number }
    | { type: 'essaim_attack', attackerId: string, targetId: string, damage: number, targetCurrentHp: number, targetMaxHp: number, blinded: boolean }
    | { type: 'spirit_action', attackerId: string, targetId: string, action: 'swap' | 'drop' | 'miss' }
    | { type: 'guardian_absorb', ownerId: string, damageAbsorbed: number, guardianHp: number }
    | { type: 'counter_attack', attackerId: string, targetId: string, damage: number, targetCurrentHp: number, targetMaxHp: number, weapon?: string }
    | { type: 'weapon_steal', thiefId: string, victimId: string, weapon: string }
    | { type: 'log', message: string }
    | { type: 'state_change', id: string, state: 'berzerk' | 'stun' | 'normal', value?: boolean }
    | { type: 'weapon_change', id: string, weapon: string | undefined }
    | { type: 'inventory_change', id: string, inventory: string[] }
    | { type: 'death', deadId: string, winnerId: string }

export class CombatEngine {
    private f1: CombatMob
    private f2: CombatMob

    private energy1: number = 0
    private energy2: number = 0
    private maggotEnergy1: number = 0
    private maggotEnergy2: number = 0
    private essaimEnergy1: number = 0
    private essaimEnergy2: number = 0
    private spiritEnergy1: number = 0
    private spiritEnergy2: number = 0

    // Companion State
    private guardianHp1: number = 0
    private guardianHp2: number = 0
    private blindDuration1: number = 0 // Number of actions blinded
    private blindDuration2: number = 0

    // Core Combat State
    private consecutiveHitsTaken1: number = 0
    private consecutiveHitsTaken2: number = 0
    private isBerzerk1: boolean = false
    private isBerzerk2: boolean = false
    private isStunned1: boolean = false
    private isStunned2: boolean = false

    private readonly MAX_ENERGY = 100

    private isRunning: boolean = false
    private onEvent: (event: CombatEvent) => void

    private f1Inventory: string[] = []
    private f2Inventory: string[] = []

    constructor(f1: MobData, f2: MobData, onEvent: (event: CombatEvent) => void) {
        this.f1 = JSON.parse(JSON.stringify(f1)) as CombatMob
        this.f2 = JSON.parse(JSON.stringify(f2)) as CombatMob
        this.onEvent = onEvent

        // "Sheathe" weapons at start
        this.f1Inventory = [...(this.f1.weapons || [])]
        this.f1.weapon = undefined

        this.f2Inventory = [...(this.f2.weapons || [])]
        this.f2.weapon = undefined

        // Initialize Guardian HP
        if (this.hasTrait(this.f1, 'Gardien de Racine')) {
            this.guardianHp1 = Math.floor((100 + this.f1.stats.vitalite * 10) * 0.5)
        }
        if (this.hasTrait(this.f2, 'Gardien de Racine')) {
            this.guardianHp2 = Math.floor((100 + this.f2.stats.vitalite * 10) * 0.5)
        }
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
            let actionReady = false
            while (!actionReady && this.isRunning) {
                this.energy1 += (this.getSpeed(this.f1) / 10) // Scaled
                this.energy2 += (this.getSpeed(this.f2) / 10)

                if (this.hasTrait(this.f1, 'Appel de l\'Astico-Roi')) this.maggotEnergy1 += (this.getSpeed(this.f1) / 10) * 0.4
                if (this.hasTrait(this.f2, 'Appel de l\'Astico-Roi')) this.maggotEnergy2 += (this.getSpeed(this.f2) / 10) * 0.4
                if (this.hasTrait(this.f1, 'Essaim de Moucherons')) this.essaimEnergy1 += (this.getSpeed(this.f1) / 10) * 1.5
                if (this.hasTrait(this.f2, 'Essaim de Moucherons')) this.essaimEnergy2 += (this.getSpeed(this.f2) / 10) * 1.5
                if (this.hasTrait(this.f1, 'Esprit Saboteur')) this.spiritEnergy1 += (this.getSpeed(this.f1) / 10) * 1.5
                if (this.hasTrait(this.f2, 'Esprit Saboteur')) this.spiritEnergy2 += (this.getSpeed(this.f2) / 10) * 1.5

                if (this.energy1 >= this.MAX_ENERGY || this.energy2 >= this.MAX_ENERGY ||
                    this.maggotEnergy1 >= this.MAX_ENERGY || this.maggotEnergy2 >= this.MAX_ENERGY ||
                    this.essaimEnergy1 >= this.MAX_ENERGY || this.essaimEnergy2 >= this.MAX_ENERGY ||
                    this.spiritEnergy1 >= this.MAX_ENERGY || this.spiritEnergy2 >= this.MAX_ENERGY) {
                    actionReady = true
                }
            }

            this.onEvent({
                type: 'tick',
                fighter1Energy: this.energy1,
                fighter2Energy: this.energy2,
                maggot1Energy: this.maggotEnergy1,
                maggot2Energy: this.maggotEnergy2,
                essaim1Energy: this.essaimEnergy1,
                essaim2Energy: this.essaimEnergy2,
                spirit1Energy: this.spiritEnergy1,
                spirit2Energy: this.spiritEnergy2
            })

            if (this.energy1 >= this.MAX_ENERGY) {
                if (this.isStunned1) {
                    this.onEvent({ type: 'log', message: `${this.f1.nom} est étourdi !` })
                    this.onEvent({ type: 'state_change', id: this.f1.id, state: 'stun', value: false })
                    this.isStunned1 = false
                } else {
                    await this.performAction(this.f1, this.f2)
                }
                this.energy1 -= this.MAX_ENERGY
            } else if (this.energy2 >= this.MAX_ENERGY) {
                if (this.isStunned2) {
                    this.onEvent({ type: 'log', message: `${this.f2.nom} est étourdi !` })
                    this.onEvent({ type: 'state_change', id: this.f2.id, state: 'stun', value: false })
                    this.isStunned2 = false
                } else {
                    await this.performAction(this.f2, this.f1)
                }
                this.energy2 -= this.MAX_ENERGY
            } else if (this.maggotEnergy1 >= this.MAX_ENERGY) {
                await this.performMaggotAction(this.f1, this.f2)
                this.maggotEnergy1 -= this.MAX_ENERGY
            } else if (this.maggotEnergy2 >= this.MAX_ENERGY) {
                await this.performMaggotAction(this.f2, this.f1)
                this.maggotEnergy2 -= this.MAX_ENERGY
            } else if (this.essaimEnergy1 >= this.MAX_ENERGY) {
                await this.performEssaimAction(this.f1, this.f2)
                this.essaimEnergy1 -= this.MAX_ENERGY
            } else if (this.essaimEnergy2 >= this.MAX_ENERGY) {
                await this.performEssaimAction(this.f2, this.f1)
                this.essaimEnergy2 -= this.MAX_ENERGY
            } else if (this.spiritEnergy1 >= this.MAX_ENERGY) {
                await this.performSpiritAction(this.f1, this.f2)
                this.spiritEnergy1 -= this.MAX_ENERGY
            } else if (this.spiritEnergy2 >= this.MAX_ENERGY) {
                await this.performSpiritAction(this.f2, this.f1)
                this.spiritEnergy2 -= this.MAX_ENERGY
            }

            await new Promise(resolve => setTimeout(resolve, 100 / this.speedMultiplier))

            if (this.f1.vie <= 0 || this.f2.vie <= 0) {
                this.isRunning = false
                const dead = this.f1.vie <= 0 ? this.f1 : this.f2
                const winner = this.f1.vie <= 0 ? this.f2 : this.f1
                this.onEvent({ type: 'log', message: `${dead.nom} est K.O. !` })
                this.onEvent({ type: 'death', deadId: dead.id, winnerId: winner.id })
                return { winner, loser: dead }
            }
        }
        return { winner: this.f1, loser: this.f2 }
    }

    private getSpeed(mob: MobData, currentHpOverride?: number): number {
        const hp = currentHpOverride !== undefined ? currentHpOverride : mob.vie
        const maxHp = 100 + (mob.stats.vitalite * 10)
        const isLowHp = hp < (maxHp * 0.2)

        let speed = mob.stats.vitesse
        if (isLowHp && this.hasTrait(mob, 'Sprint Final')) {
            speed *= 2
        }
        return speed
    }

    private hasTrait(mob: MobData, trait: string): boolean {
        return (mob.traits || []).includes(trait)
    }

    private getInventory(mobId: string): string[] {
        return mobId === this.f1.id ? this.f1Inventory : this.f2Inventory
    }

    private async performAction(attacker: CombatMob, defender: CombatMob, isCounter: boolean = false): Promise<void> {
        // Draw Weapon
        const inventory = this.getInventory(attacker.id)
        if (!attacker.weapon && inventory.length > 0) {
            if (Math.random() < 0.3) {
                const index = Math.floor(Math.random() * inventory.length)
                const drawnWeapon = inventory[index]
                inventory.splice(index, 1)
                attacker.weapon = drawnWeapon
                this.onEvent({ type: 'log', message: `${attacker.nom} dégaine : ${attacker.weapon} !` })
                this.onEvent({ type: 'weapon_change', id: attacker.id, weapon: attacker.weapon })
                this.onEvent({ type: 'inventory_change', id: attacker.id, inventory: [...inventory] })
            }
        }

        // Throw Weapon
        if (attacker.weapon && !isCounter && Math.random() < 0.2) {
            await this.throwWeapon(attacker, defender)
            return
        }

        // Range check
        const attWeapon = WEAPON_REGISTRY[attacker.weapon || '']
        const defWeapon = WEAPON_REGISTRY[defender.weapon || '']
        if (!isCounter && attWeapon?.type === 'short' && defWeapon?.type === 'long') {
            if (Math.random() < (defWeapon.effects?.counterChance || 0.25)) {
                this.onEvent({ type: 'log', message: `${defender.nom} garde ${attacker.nom} à distance !` })
                await this.triggerCounterAttack(defender, attacker)
                return
            }
        }

        // Berzerk (2 hits at 70% damage)
        const attackCount = (this.isBerzerk(attacker) && !isCounter) ? 2 : 1
        for (let i = 0; i < attackCount; i++) {
            if (i > 0) await new Promise(r => setTimeout(r, 200))

            const hitResult = this.calculateHit(attacker, defender)
            if (hitResult.isHit) {
                this.applyDamage(attacker, defender, hitResult.damage, hitResult.isCritical)
                await this.handleOnHitEvents(defender, attacker)

                // Drop Weapon
                if (attacker.weapon) {
                    const w = WEAPON_REGISTRY[attacker.weapon]
                    let p = w?.type === 'short' ? 0.05 : w?.type === 'long' ? 0.15 : w?.type === 'shield' ? 0.10 : 0
                    if (Math.random() < p) {
                        this.onEvent({ type: 'log', message: `${attacker.nom} laisse glisser son arme !` })
                        attacker.weapon = undefined
                        this.onEvent({ type: 'weapon_change', id: attacker.id, weapon: undefined })
                    }
                }
            } else {
                this.onEvent({ type: 'dodge', attackerId: attacker.id, targetId: defender.id, targetCurrentHp: defender.vie })
                this.onEvent({ type: 'log', message: `${defender.nom} esquive !` })
                await this.handleOnHitEvents(defender, attacker)
            }
        }
    }

    private async throwWeapon(attacker: CombatMob, defender: CombatMob) {
        const weaponName = attacker.weapon
        if (!weaponName) return
        this.onEvent({ type: 'log', message: `${attacker.nom} lance son ${weaponName} !` })
        let damage = attacker.stats.force
        const weapon = WEAPON_REGISTRY[weaponName]
        if (weapon) damage += weapon.damageBonus
        damage = Math.floor(damage * 1.05)

        const hitResult = this.calculateHit(attacker, defender)
        if (hitResult.isHit) {
            this.applyDamage(attacker, defender, damage, hitResult.isCritical)
            await this.handleOnHitEvents(defender, attacker)
        } else {
            this.onEvent({ type: 'dodge', attackerId: attacker.id, targetId: defender.id, targetCurrentHp: defender.vie })
        }
        attacker.weapon = undefined
        this.onEvent({ type: 'weapon_change', id: attacker.id, weapon: undefined })
    }

    private async performMaggotAction(owner: CombatMob, target: CombatMob) {
        const d = 5 + Math.floor(Math.random() * 5)
        const actual = this.calculateDamageReduction(target, d)
        target.vie -= actual
        const maxHp = 100 + (target.stats.vitalite * 10)
        this.onEvent({ type: 'maggot_attack', attackerId: owner.id, targetId: target.id, damage: actual, targetCurrentHp: target.vie, targetMaxHp: maxHp })
        await this.handleOnHitEvents(target, owner)
    }

    private calculateHit(attacker: CombatMob, defender: CombatMob) {
        const blindDebuff = (attacker.id === this.f1.id ? this.blindDuration1 : this.blindDuration2) > 0 ? 5 : 0
        const dodge = 0.1 + (defender.stats.agilite - (attacker.stats.agilite - blindDebuff)) * 0.02

        if (blindDebuff > 0) {
            if (attacker.id === this.f1.id) this.blindDuration1--; else this.blindDuration2--
        }

        if (Math.random() < Math.max(0.05, dodge)) return { isHit: false, damage: 0, isCritical: false }

        let damage = attacker.stats.force + Math.floor(Math.random() * 5)
        const weapon = WEAPON_REGISTRY[attacker.weapon || '']
        if (weapon) damage += weapon.damageBonus

        const crit = this.hasTrait(attacker, 'Coup Critique') ? 0.33 : 0.1
        let isCritical = false
        if (Math.random() < crit) { damage *= 2; isCritical = true }

        damage = this.calculateDamageReduction(defender, damage)

        // Berzerk Damage Penalty (70% damage per hit)
        if (this.isBerzerk(attacker)) {
            damage = Math.floor(damage * 0.7)
        }

        return { isHit: true, damage, isCritical }
    }

    private calculateDamageReduction(defender: CombatMob, damage: number) {
        let red = this.hasTrait(defender, 'Peau de Cuir') ? 0.1 : 0
        const w = WEAPON_REGISTRY[defender.weapon || '']
        if (w?.type === 'shield' && w.effects?.blockChance && Math.random() < w.effects.blockChance) {
            red += 0.5
            this.onEvent({ type: 'log', message: `${defender.nom} BLOQUE !` })
        }
        return Math.floor(damage * (1 - red))
    }

    private applyDamage(attacker: CombatMob, defender: CombatMob, damage: number, isCritical: boolean) {
        let finalDamage = damage

        // Root Guardian Interception
        const gHp = defender.id === this.f1.id ? this.guardianHp1 : this.guardianHp2
        if (gHp > 0) {
            const absorbed = Math.floor(finalDamage * 0.15)
            const actualAbsorbed = Math.min(absorbed, gHp)
            finalDamage -= actualAbsorbed
            if (defender.id === this.f1.id) this.guardianHp1 -= actualAbsorbed; else this.guardianHp2 -= actualAbsorbed

            this.onEvent({
                type: 'guardian_absorb',
                ownerId: defender.id,
                damageAbsorbed: actualAbsorbed,
                guardianHp: defender.id === this.f1.id ? this.guardianHp1 : this.guardianHp2
            })
            this.onEvent({ type: 'log', message: `Le Gardien de ${defender.nom} intercepte ${actualAbsorbed} dégâts !` })
        }

        defender.vie -= finalDamage
        const maxHp = 100 + (defender.stats.vitalite * 10)
        this.onEvent({ type: 'attack', attackerId: attacker.id, targetId: defender.id, damage: finalDamage, isCritical, targetCurrentHp: defender.vie, targetMaxHp: maxHp, visual: this.isBerzerk(attacker) ? 'berzerk' : 'normal', weapon: attacker.weapon })
        this.onEvent({ type: 'log', message: `${attacker.nom} inflige ${finalDamage} dégâts !` })

        const w = WEAPON_REGISTRY[attacker.weapon || '']
        if (w?.effects?.stunChance && !this.isBerzerk(attacker) && Math.random() < w.effects.stunChance) {
            this.applyStun(defender)
        }
    }

    private applyStun(target: CombatMob) {
        if (target.id === this.f1.id) this.isStunned1 = true
        else this.isStunned2 = true
        this.onEvent({ type: 'state_change', id: target.id, state: 'stun', value: true })
        this.onEvent({ type: 'log', message: `${target.nom} est ÉTOURDI !` })
    }

    private async handleOnHitEvents(victim: CombatMob, source: CombatMob) {
        // GLOBAL WEAPON STEALING
        if (!victim.weapon && source.weapon) {
            this.stealWeapon(victim, source)
        }

        if (this.hasTrait(victim, 'Berzerk')) this.handleBerzerkStack(victim)

        if (this.hasTrait(victim, 'Contre-attaque') && Math.random() < 0.10) {
            await this.triggerCounterAttack(victim, source)
        }
    }

    private handleBerzerkStack(mob: CombatMob) {
        if (mob.id === this.f1.id) {
            this.consecutiveHitsTaken1++
            this.consecutiveHitsTaken2 = 0
            if (this.consecutiveHitsTaken1 >= 3 && !this.isBerzerk1) {
                this.isBerzerk1 = true
                this.onEvent({ type: 'state_change', id: mob.id, state: 'berzerk', value: true })
                this.onEvent({ type: 'log', message: `${mob.nom} EN BERZERK !` })
            }
        } else {
            this.consecutiveHitsTaken2++
            this.consecutiveHitsTaken1 = 0
            if (this.consecutiveHitsTaken2 >= 3 && !this.isBerzerk2) {
                this.isBerzerk2 = true
                this.onEvent({ type: 'state_change', id: mob.id, state: 'berzerk', value: true })
                this.onEvent({ type: 'log', message: `${mob.nom} EN BERZERK !` })
            }
        }
    }

    private async triggerCounterAttack(attacker: CombatMob, target: CombatMob) {
        await new Promise(resolve => setTimeout(resolve, 600 / this.speedMultiplier))
        const damage = attacker.stats.force
        const reduced = this.calculateDamageReduction(target, damage)
        target.vie -= reduced
        const maxHp = 100 + (target.stats.vitalite * 10)
        this.onEvent({ type: 'counter_attack', attackerId: attacker.id, targetId: target.id, damage: reduced, targetCurrentHp: target.vie, targetMaxHp: maxHp, weapon: attacker.weapon })
        this.onEvent({ type: 'log', message: `${attacker.nom} CONTRE-ATTAQUE !` })
    }

    private stealWeapon(thief: CombatMob, victim: CombatMob) {
        const weapon = victim.weapon
        if (!weapon) return
        thief.weapon = weapon
        victim.weapon = undefined
        this.onEvent({ type: 'weapon_steal', thiefId: thief.id, victimId: victim.id, weapon })
        this.onEvent({ type: 'weapon_change', id: thief.id, weapon: thief.weapon })
        this.onEvent({ type: 'weapon_change', id: victim.id, weapon: undefined })
        this.onEvent({ type: 'log', message: `${thief.nom} vole l'arme de ${victim.nom} !` })
    }

    private isBerzerk(mob: CombatMob): boolean {
        return mob.id === this.f1.id ? this.isBerzerk1 : this.isBerzerk2
    }

    private async performEssaimAction(owner: CombatMob, target: CombatMob) {
        const damage = 2 + Math.floor(Math.random() * 2) // 2-3 damage
        const actual = this.calculateDamageReduction(target, damage)
        target.vie -= actual

        let blinded = false
        if (Math.random() < 0.30) {
            blinded = true
            if (target.id === this.f1.id) this.blindDuration1++; else this.blindDuration2++
            this.onEvent({ type: 'log', message: `L'Essaim aveugle ${target.nom} !` })
        }

        const maxHp = 100 + (target.stats.vitalite * 10)
        this.onEvent({ type: 'essaim_attack', attackerId: owner.id, targetId: target.id, damage: actual, targetCurrentHp: target.vie, targetMaxHp: maxHp, blinded })
        await this.handleOnHitEvents(target, owner)
    }

    private async performSpiritAction(owner: CombatMob, target: CombatMob) {
        const rand = Math.random()
        const inventory = this.getInventory(target.id)

        if (rand < 0.50 && target.weapon) {
            // Drop weapon
            target.weapon = undefined
            this.onEvent({ type: 'weapon_change', id: target.id, weapon: undefined })
            this.onEvent({ type: 'log', message: `L'Esprit Saboteur fait lâcher son arme à ${target.nom} !` })
            this.onEvent({ type: 'spirit_action', attackerId: owner.id, targetId: target.id, action: 'drop' })
        } else if (inventory.length > 0) {
            // Swap weapon
            const index = Math.floor(Math.random() * inventory.length)
            const oldWeapon = target.weapon
            target.weapon = inventory[index]
            inventory.splice(index, 1)
            if (oldWeapon) inventory.push(oldWeapon)

            this.onEvent({ type: 'weapon_change', id: target.id, weapon: target.weapon })
            this.onEvent({ type: 'inventory_change', id: target.id, inventory: [...inventory] })
            this.onEvent({ type: 'log', message: `L'Esprit Saboteur échange l'arme de ${target.nom} !` })
            this.onEvent({ type: 'spirit_action', attackerId: owner.id, targetId: target.id, action: 'swap' })
        } else {
            // Fallback Slap (2-3 dmg scaled)
            const damage = 2 + Math.floor(Math.random() * 2)
            const actual = this.calculateDamageReduction(target, damage)
            target.vie -= actual
            const maxHp = 100 + (target.stats.vitalite * 10)
            this.onEvent({ type: 'log', message: `L'Esprit Saboteur gifle ${target.nom} !` })
            this.onEvent({ type: 'attack', attackerId: owner.id, targetId: target.id, damage: actual, isCritical: false, targetCurrentHp: target.vie, targetMaxHp: maxHp })
            this.onEvent({ type: 'spirit_action', attackerId: owner.id, targetId: target.id, action: 'miss' })
        }
        await this.handleOnHitEvents(target, owner)
    }
}
