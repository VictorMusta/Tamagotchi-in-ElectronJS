import { MobData } from '../../../shared/types'

export type CombatEvent =
    | { type: 'tick', fighter1Energy: number, fighter2Energy: number }
    | { type: 'attack', attackerId: string, targetId: string, damage: number, isCritical: boolean, targetCurrentHp: number, targetMaxHp: number, weapon?: string }
    | { type: 'dodge', attackerId: string, targetId: string }
    | { type: 'maggot_attack', attackerId: string, targetId: string, damage: number, targetCurrentHp: number, targetMaxHp: number }
    | { type: 'weapon_fail', attackerId: string, weapon: string, reason: 'miss' | 'drop' | 'broken' }
    | { type: 'death', deadId: string, winnerId: string }
    | { type: 'log', message: string }

export class CombatEngine {
    private f1: MobData
    private f2: MobData

    private energy1: number = 0
    private energy2: number = 0
    private readonly MAX_ENERGY = 100

    private isRunning: boolean = false
    private onEvent: (event: CombatEvent) => void

    constructor(f1: MobData, f2: MobData, onEvent: (event: CombatEvent) => void) {
        this.f1 = JSON.parse(JSON.stringify(f1))
        this.f2 = JSON.parse(JSON.stringify(f2))
        this.onEvent = onEvent
    }

    private speedMultiplier: number = 1

    setSpeed(speed: number): void {
        this.speedMultiplier = speed
    }

    async start(): Promise<{ winner: MobData, loser: MobData }> {
        this.isRunning = true
        this.onEvent({ type: 'log', message: `Le combat commence : ${this.f1.nom} vs ${this.f2.nom} !` })

        // Petit délai avant le premier coup
        await new Promise(resolve => setTimeout(resolve, 1000 / this.speedMultiplier))

        while (this.isRunning) {
            // 1. Phase de calcul (instantanée) : Avancer le temps jusqu'à ce que quelqu'un agisse
            // On fait des "mini-ticks" logiques jusqu'à ce qu'une barre soit pleine
            let actionReady = false
            while (!actionReady) {
                this.energy1 += this.f1.stats.vitesse
                this.energy2 += this.f2.stats.vitesse

                if (this.energy1 >= this.MAX_ENERGY || this.energy2 >= this.MAX_ENERGY) {
                    actionReady = true
                }
            }

            // Mise à jour visuelle des barres (instantanée pour l'utilisateur, ou presque)
            this.onEvent({ type: 'tick', fighter1Energy: this.energy1, fighter2Energy: this.energy2 })

            // 2. Phase d'Action
            // On détermine qui attaque. En cas d'égalité, le plus rapide (ou random) l'emporte.
            // Si F1 est prêt
            if (this.energy1 >= this.MAX_ENERGY && (this.energy1 >= this.energy2)) {
                await this.performAction(this.f1, this.f2)
                this.energy1 -= this.MAX_ENERGY
            }
            // Si F2 est prêt (et que F1 n'a pas agi, ou que F2 est encore prêt après ?)
            // Note: Dans un système ATB simple, un seul agit par "tour de boucle".
            else if (this.energy2 >= this.MAX_ENERGY) {
                await this.performAction(this.f2, this.f1)
                this.energy2 -= this.MAX_ENERGY
            }

            // 3. Phase de Rythme
            // On force une pause CONSTANTE ajustée par la vitesse
            // Base: 1200ms. x2 -> 600ms.
            await new Promise(resolve => setTimeout(resolve, 1200 / this.speedMultiplier))

            // 4. Vérification de mort
            if (this.f1.vie <= 0 || this.f2.vie <= 0) {
                this.isRunning = false
                const dead = this.f1.vie <= 0 ? this.f1 : this.f2
                const winner = this.f1.vie <= 0 ? this.f2 : this.f1
                this.onEvent({ type: 'log', message: `${dead.nom} est K.O. !` })
                this.onEvent({ type: 'death', deadId: dead.id, winnerId: winner.id })
                return { winner, loser: dead } // FIXED: Return both
            }
        }

        const winner = this.f1.vie > 0 ? this.f1 : this.f2
        const loser = this.f1.vie > 0 ? this.f2 : this.f1
        return { winner, loser } // Fallback
    }

    private async performAction(attacker: MobData, defender: MobData): Promise<void> {
        const dodgeChance = 0.1 + (defender.stats.agilite - attacker.stats.agilite) * 0.02
        if (Math.random() < Math.max(0.05, dodgeChance)) {
            this.onEvent({ type: 'dodge', attackerId: attacker.id, targetId: defender.id })
            this.onEvent({ type: 'log', message: `${defender.nom} esquive l'attaque !` })
            return
        }

        if (attacker.traits.includes('Appel de l\'Astico-Roi') || Math.random() < 0.1) {
            if (Math.random() < 0.3) {
                const maggotDamage = 5 + Math.floor(Math.random() * 5)
                defender.vie -= maggotDamage
                const defenderMaxHP = 100 + ((defender.stats?.vitalite || 0) * 5)
                this.onEvent({
                    type: 'maggot_attack',
                    attackerId: attacker.id,
                    targetId: defender.id,
                    damage: maggotDamage,
                    targetCurrentHp: defender.vie,
                    targetMaxHp: defenderMaxHP
                })
                this.onEvent({ type: 'log', message: `L'astico-compagnon de ${attacker.nom} mord ${defender.nom} (-${maggotDamage}) !` })
                return
            }
        }

        let damage = attacker.stats.force + Math.floor(Math.random() * 5)
        let isCritical = false

        const critChance = attacker.traits.includes('Coup Critique') ? 0.33 : 0.1
        if (Math.random() < critChance) {
            damage *= 2
            isCritical = true
        }

        defender.vie -= damage
        const defenderMaxHP = 100 + ((defender.stats?.vitalite || 0) * 5)
        this.onEvent({
            type: 'attack',
            attackerId: attacker.id,
            targetId: defender.id,
            damage,
            isCritical,
            targetCurrentHp: defender.vie,
            targetMaxHp: defenderMaxHP
        })
        this.onEvent({ type: 'log', message: `${attacker.nom} frappe ${defender.nom} pour ${damage} dégâts !` })
    }
}
