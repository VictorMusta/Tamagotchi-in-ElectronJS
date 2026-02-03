
import { MobData, MobStats } from './src/shared/types'
import { WEAPON_REGISTRY } from './src/shared/WeaponRegistry'
import { TRAIT_DEFINITIONS } from './src/renderer/src/mob/TraitDefinitions'

// --- Headless Combat Engine (Synchronous Mirror of CombatEngine.ts) ---

interface CombatMob extends MobData {
    weapon?: string
}

class HeadlessCombatEngine {
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
    private consecutiveHitsTaken1: number = 0
    private consecutiveHitsTaken2: number = 0
    private isBerzerk1: boolean = false
    private isBerzerk2: boolean = false
    private isStunned1: boolean = false
    private isStunned2: boolean = false
    private guardianHp1: number = 0
    private guardianHp2: number = 0
    private blindDuration1: number = 0
    private blindDuration2: number = 0
    private f1Inventory: string[] = []
    private f2Inventory: string[] = []
    private readonly MAX_ENERGY = 100

    constructor(f1: MobData, f2: MobData) {
        this.f1 = JSON.parse(JSON.stringify(f1))
        this.f2 = JSON.parse(JSON.stringify(f2))
        this.f1Inventory = [...(this.f1.weapons || [])]
        this.f1.weapon = undefined
        this.f2Inventory = [...(this.f2.weapons || [])]
        this.f2.weapon = undefined

        if (this.hasTrait(this.f1, 'Gardien de Racine')) {
            this.guardianHp1 = Math.floor((100 + this.f1.stats.vitalite * 10) * 0.5)
        }
        if (this.hasTrait(this.f2, 'Gardien de Racine')) {
            this.guardianHp2 = Math.floor((100 + this.f2.stats.vitalite * 10) * 0.5)
        }
    }

    run(): { winner: MobData; loser: MobData } {
        while (this.f1.vie > 0 && this.f2.vie > 0) {
            // 1. Tick
            while (this.energy1 < this.MAX_ENERGY && this.energy2 < this.MAX_ENERGY &&
                this.maggotEnergy1 < this.MAX_ENERGY && this.maggotEnergy2 < this.MAX_ENERGY &&
                this.essaimEnergy1 < this.MAX_ENERGY && this.essaimEnergy2 < this.MAX_ENERGY &&
                this.spiritEnergy1 < this.MAX_ENERGY && this.spiritEnergy2 < this.MAX_ENERGY) {
                this.energy1 += this.getSpeed(this.f1)
                this.energy2 += this.getSpeed(this.f2)
                if (this.hasTrait(this.f1, "Appel de l'Astico-Roi")) this.maggotEnergy1 += this.getSpeed(this.f1) * 0.4
                if (this.hasTrait(this.f2, "Appel de l'Astico-Roi")) this.maggotEnergy2 += this.getSpeed(this.f2) * 0.4
                if (this.hasTrait(this.f1, "Essaim de Moucherons")) this.essaimEnergy1 += this.getSpeed(this.f1) * 1.5
                if (this.hasTrait(this.f2, "Essaim de Moucherons")) this.essaimEnergy2 += this.getSpeed(this.f2) * 1.5
                if (this.hasTrait(this.f1, "Esprit Saboteur")) this.spiritEnergy1 += this.getSpeed(this.f1) * 2.0
                if (this.hasTrait(this.f2, "Esprit Saboteur")) this.spiritEnergy2 += this.getSpeed(this.f2) * 2.0
            }

            // 2. Action Resolution
            if (this.energy1 >= this.MAX_ENERGY) {
                if (!this.isStunned1) this.performAction(this.f1, this.f2)
                else this.isStunned1 = false
                this.energy1 -= this.MAX_ENERGY
            } else if (this.energy2 >= this.MAX_ENERGY) {
                if (!this.isStunned2) this.performAction(this.f2, this.f1)
                else this.isStunned2 = false
                this.energy2 -= this.MAX_ENERGY
            } else if (this.maggotEnergy1 >= this.MAX_ENERGY) {
                this.performMaggotAction(this.f1, this.f2)
                this.maggotEnergy1 -= this.MAX_ENERGY
            } else if (this.maggotEnergy2 >= this.MAX_ENERGY) {
                this.performMaggotAction(this.f2, this.f1)
                this.maggotEnergy2 -= this.MAX_ENERGY
            } else if (this.essaimEnergy1 >= this.MAX_ENERGY) {
                this.performEssaimAction(this.f1, this.f2)
                this.essaimEnergy1 -= this.MAX_ENERGY
            } else if (this.essaimEnergy2 >= this.MAX_ENERGY) {
                this.performEssaimAction(this.f2, this.f1)
                this.essaimEnergy2 -= this.MAX_ENERGY
            } else if (this.spiritEnergy1 >= this.MAX_ENERGY) {
                this.performSpiritAction(this.f1, this.f2)
                this.spiritEnergy1 -= this.MAX_ENERGY
            } else if (this.spiritEnergy2 >= this.MAX_ENERGY) {
                this.performSpiritAction(this.f2, this.f1)
                this.spiritEnergy2 -= this.MAX_ENERGY
            }
        }
        return this.f1.vie <= 0 ? { winner: this.f2, loser: this.f1 } : { winner: this.f1, loser: this.f2 }
    }

    private getSpeed(mob: MobData): number {
        const maxHp = 100 + (mob.stats.vitalite * 10)
        let speed = mob.stats.vitesse
        if (mob.vie < maxHp * 0.2 && this.hasTrait(mob, 'Sprint Final')) speed *= 2
        return speed
    }

    private hasTrait(mob: MobData, trait: string): boolean {
        return mob.traits.includes(trait)
    }

    private performAction(attacker: CombatMob, defender: CombatMob, isCounter: boolean = false) {
        const inventory = attacker.id === this.f1.id ? this.f1Inventory : this.f2Inventory
        if (!attacker.weapon && inventory.length > 0 && Math.random() < 0.3) {
            attacker.weapon = inventory.splice(Math.floor(Math.random() * inventory.length), 1)[0]
        }

        if (attacker.weapon && !isCounter && Math.random() < 0.2) {
            this.throwWeapon(attacker, defender)
            return
        }

        const attWeapon = WEAPON_REGISTRY[attacker.weapon || '']
        const defWeapon = WEAPON_REGISTRY[defender.weapon || '']

        if (!isCounter && attWeapon?.type === 'short' && defWeapon?.type === 'long') {
            if (Math.random() < (defWeapon.effects?.counterChance || 0.25)) {
                this.triggerCounterAttack(defender, attacker)
                return
            }
        }

        const attackCount = (this.isBerzerk(attacker) && !isCounter) ? 2 : 1
        for (let i = 0; i < attackCount; i++) {
            const hit = this.calculateHit(attacker, defender)
            if (hit.isHit) {
                this.applyDamage(attacker, defender, hit.damage)
                this.handleOnHitEvents(defender, attacker)
                if (attacker.weapon) {
                    const currentWeapon = WEAPON_REGISTRY[attacker.weapon]
                    let dropChance = 0
                    if (currentWeapon?.type === 'short') dropChance = 0.05
                    else if (currentWeapon?.type === 'long') dropChance = 0.15
                    else if (currentWeapon?.type === 'shield') dropChance = 0.10
                    if (Math.random() < dropChance) attacker.weapon = undefined
                }
                const weapon = WEAPON_REGISTRY[attacker.weapon || '']
                if (weapon?.effects?.stunChance && Math.random() < weapon.effects.stunChance) {
                    if (defender.id === this.f1.id) this.isStunned1 = true; else this.isStunned2 = true
                }
            } else {
                this.handleOnHitEvents(defender, attacker)
            }
        }
    }

    private throwWeapon(attacker: CombatMob, defender: CombatMob) {
        let damage = attacker.stats.force
        const weapon = WEAPON_REGISTRY[attacker.weapon || '']
        if (weapon) damage += weapon.damageBonus
        damage = Math.floor(damage * 1.05)
        if (this.calculateHit(attacker, defender).isHit) {
            this.applyDamage(attacker, defender, damage)
            this.handleOnHitEvents(defender, attacker)
        }
        attacker.weapon = undefined
    }

    private performMaggotAction(owner: CombatMob, target: CombatMob) {
        const damage = this.calculateDamageReduction(target, 5 + Math.floor(Math.random() * 5))
        this.applyDamage(owner, target, damage)
        this.handleOnHitEvents(target, owner)
    }

    private performEssaimAction(owner: CombatMob, target: CombatMob) {
        const damage = 2 + Math.floor(Math.random() * 2)
        const actual = this.calculateDamageReduction(target, damage)
        this.applyDamage(owner, target, actual)
        if (Math.random() < 0.30) {
            if (target.id === this.f1.id) this.blindDuration1++; else this.blindDuration2++
        }
        this.handleOnHitEvents(target, owner)
    }

    private performSpiritAction(owner: CombatMob, target: CombatMob) {
        const rand = Math.random()
        const inventory = target.id === this.f1.id ? this.f1Inventory : this.f2Inventory

        if (rand < 0.50 && target.weapon) {
            target.weapon = undefined
        } else if (inventory.length > 0) {
            const index = Math.floor(Math.random() * inventory.length)
            const oldWeapon = target.weapon
            target.weapon = inventory[index]
            inventory.splice(index, 1)
            if (oldWeapon) inventory.push(oldWeapon)
        } else {
            // Slap fallback
            this.applyDamage(owner, target, 2 + Math.floor(Math.random() * 2))
        }
        this.handleOnHitEvents(target, owner)
    }

    private applyDamage(source: CombatMob, target: CombatMob, damage: number) {
        let finalDamage = damage
        const gHp = target.id === this.f1.id ? this.guardianHp1 : this.guardianHp2
        if (gHp > 0) {
            const absorbed = Math.floor(finalDamage * 0.15)
            const actualAbsorbed = Math.min(absorbed, gHp)
            finalDamage -= actualAbsorbed
            if (target.id === this.f1.id) this.guardianHp1 -= actualAbsorbed; else this.guardianHp2 -= actualAbsorbed
        }
        target.vie -= finalDamage
    }

    private calculateHit(attacker: CombatMob, defender: CombatMob) {
        const blindDebuff = (attacker.id === this.f1.id ? this.blindDuration1 : this.blindDuration2) > 0 ? 5 : 0
        const dodgeChance = 0.1 + (defender.stats.agilite - (attacker.stats.agilite - blindDebuff)) * 0.02
        if (blindDebuff > 0) {
            if (attacker.id === this.f1.id) this.blindDuration1--; else this.blindDuration2--
        }
        if (Math.random() < Math.max(0.05, dodgeChance)) return { isHit: false, damage: 0 }
        let damage = attacker.stats.force + Math.floor(Math.random() * 5)
        const weapon = WEAPON_REGISTRY[attacker.weapon || '']
        if (weapon) damage += weapon.damageBonus
        if (Math.random() < (this.hasTrait(attacker, 'Coup Critique') ? 0.33 : 0.1)) damage *= 2

        damage = this.calculateDamageReduction(defender, damage)
        if (this.isBerzerk(attacker)) damage = Math.floor(damage * 0.7)

        return { isHit: true, damage }
    }

    private calculateDamageReduction(defender: CombatMob, incomeDamage: number): number {
        let reduction = this.hasTrait(defender, 'Peau de Cuir') ? 0.1 : 0
        const weapon = WEAPON_REGISTRY[defender.weapon || '']
        if (weapon?.type === 'shield' && Math.random() < (weapon.effects?.blockChance || 0)) reduction += 0.5
        return Math.floor(incomeDamage * (1 - reduction))
    }

    private handleOnHitEvents(victim: CombatMob, source: CombatMob) {
        // GLOBAL WEAPON STEALING
        if (!victim.weapon && source.weapon) {
            this.stealWeapon(victim, source)
        }

        if (this.hasTrait(victim, 'Berzerk')) {
            if (victim.id === this.f1.id) {
                this.consecutiveHitsTaken1++; if (this.consecutiveHitsTaken1 >= 3) this.isBerzerk1 = true
            } else {
                this.consecutiveHitsTaken2++; if (this.consecutiveHitsTaken2 >= 3) this.isBerzerk2 = true
            }
        }
        if (this.hasTrait(victim, 'Contre-attaque') && Math.random() < 0.10) {
            this.triggerCounterAttack(victim, source)
        }
    }

    private triggerCounterAttack(attacker: CombatMob, target: CombatMob) {
        const damage = attacker.stats.force // 100% Damage
        target.vie -= this.calculateDamageReduction(target, damage)
    }

    private stealWeapon(thief: CombatMob, victim: CombatMob) {
        const weapon = victim.weapon
        if (!weapon) return
        thief.weapon = weapon
        victim.weapon = undefined
    }

    private isBerzerk(mob: CombatMob): boolean {
        return mob.id === this.f1.id ? this.isBerzerk1 : this.isBerzerk2
    }
}

// --- Mob Generator ---

const traitsList = Object.keys(TRAIT_DEFINITIONS)
const weaponsList = Object.keys(WEAPON_REGISTRY)

function generateMob(id: string): MobData {
    const stats: MobStats = { force: 5, vitesse: 5, agilite: 5, vitalite: 5 }

    // Start at level 1, no extra traits or weapons initially
    const mob: MobData = {
        id,
        nom: `Mob ${id}`,
        imageUrl: '',
        vie: 100 + (stats.vitalite * 10),
        energie: 0,
        status: 'vivant' as const,
        stats,
        level: 1,
        experience: 0,
        statPoints: 0,
        traits: [],
        skin: { hat: 'none' },
        combatProgress: { wins: 0, losses: 0, winStreak: 0, tournamentWins: 0 },
        inSquad: true,
        weapons: []
    }

    // Level up to 5
    for (let i = 1; i < 5; i++) {
        levelUpMob(mob)
    }

    return mob
}

function levelUpMob(mob: MobData) {
    mob.level++

    // Mimic the 3-choice system from MobModel.ts
    const choices: any[] = []
    const statKeys: (keyof MobStats)[] = ['force', 'vitesse', 'agilite', 'vitalite']

    // 1. Stat Choice
    const randomStat = statKeys[Math.floor(Math.random() * statKeys.length)]
    choices.push({ type: 'stat', stat: randomStat })

    // 2. Weapon Choice
    const availableWeapons = weaponsList.filter(w => !mob.weapons.includes(w))
    if (availableWeapons.length > 0) {
        choices.push({ type: 'weapon', name: availableWeapons[Math.floor(Math.random() * availableWeapons.length)] })
    } else {
        choices.push({ type: 'stat', stat: statKeys[Math.floor(Math.random() * statKeys.length)] })
    }

    // 3. Trait Choice
    const availableTraits = traitsList.filter(t => !mob.traits.includes(t))
    if (mob.traits.length < 6 && availableTraits.length > 0) {
        choices.push({ type: 'trait', name: availableTraits[Math.floor(Math.random() * availableTraits.length)] })
    } else {
        choices.push({ type: 'stat', stat: statKeys[Math.floor(Math.random() * statKeys.length)] })
    }

    // Pick one choice randomly
    const choice = choices[Math.floor(Math.random() * choices.length)]
    if (choice.type === 'stat') {
        mob.stats[choice.stat as keyof MobStats]++
    } else if (choice.type === 'weapon') {
        mob.weapons.push(choice.name)
        const weaponDef = WEAPON_REGISTRY[choice.name]
        if (weaponDef?.statBonus) {
            mob.stats[weaponDef.statBonus.stat as keyof MobStats] += weaponDef.statBonus.amount
        }
    } else if (choice.type === 'trait') {
        mob.traits.push(choice.name)
    }

    // Update derived values
    mob.vie = 100 + (mob.stats.vitalite * 10)
}

// --- Simulation Loop ---

const TOTAL_MATCHES = 1000000
const traitStats: Record<string, { wins: number, appearances: number }> = {}
const weaponStats: Record<string, { wins: number, appearances: number }> = {}
const statStats: Record<string, { wins: number, totalValue: number, count: number }> = {
    force: { wins: 0, totalValue: 0, count: 0 },
    vitesse: { wins: 0, totalValue: 0, count: 0 },
    agilite: { wins: 0, totalValue: 0, count: 0 },
    vitalite: { wins: 0, totalValue: 0, count: 0 }
}

// Matrix for trait matchups: [traitA][traitB] = { wins: number, appearances: number }
const traitMatchups: Record<string, Record<string, { wins: number, games: number }>> = {}

traitsList.forEach(t => {
    traitStats[t] = { wins: 0, appearances: 0 }
    traitMatchups[t] = {}
    traitsList.forEach(t2 => {
        if (t !== t2) traitMatchups[t][t2] = { wins: 0, games: 0 }
    })
})
weaponsList.forEach(w => weaponStats[w] = { wins: 0, appearances: 0 })

console.log(`Starting simulation of ${TOTAL_MATCHES} matches...`)
const startTime = Date.now()

for (let i = 0; i < TOTAL_MATCHES; i++) {
    const f1 = generateMob('P1')
    const f2 = generateMob('P2')

    const engine = new HeadlessCombatEngine(f1, f2)
    const { winner, loser } = engine.run()

    // Record appearances
    const f1Traits = f1.traits
    const f2Traits = f2.traits
    const winnerTraits = winner.traits
    const loserTraits = loser.traits

    // Update Overall Stats
    const fighters = [f1, f2]
    fighters.forEach(f => {
        f.traits.forEach(t => traitStats[t].appearances++)
        f.weapons.forEach(w => weaponStats[w].appearances++)
    })
    winner.traits.forEach(t => traitStats[t].wins++)
    winner.weapons.forEach(w => weaponStats[w].wins++)

    // Update Matchup Matrix
    // F1 vs F2
    f1Traits.forEach(t1 => {
        f2Traits.forEach(t2 => {
            if (t1 === t2) return // Skip same trait matchups for now or track separately? Let's skip.
            traitMatchups[t1][t2].games++
            if (winner.id === f1.id) traitMatchups[t1][t2].wins++

            traitMatchups[t2][t1].games++
            if (winner.id === f2.id) traitMatchups[t2][t1].wins++
        })
    })

    // Record stat influence
    Object.keys(winner.stats).forEach(s => {
        statStats[s].wins += winner.stats[s as keyof MobStats]
    })
    fighters.forEach(f => {
        Object.keys(f.stats).forEach(s => {
            statStats[s].totalValue += f.stats[s as keyof MobStats]
            statStats[s].count++
        })
    })

    if (i > 0 && i % 100000 === 0) {
        console.log(`Progress: ${i} matches (${Math.floor(i / TOTAL_MATCHES * 100)}%)`)
    }
}

const duration = (Date.now() - startTime) / 1000
console.log(`Simulation finished in ${duration.toFixed(2)}s`)

// --- Report Generation ---

console.log("\n--- SIMULATION REPORT ---")
console.log("| Trait | Winrate | Appearances |")
console.log("| :--- | :--- | :--- |")
Object.entries(traitStats).sort((a, b) => (b[1].wins / b[1].appearances) - (a[1].wins / a[1].appearances)).forEach(([trait, stats]) => {
    const winrate = (stats.wins / stats.appearances * 100).toFixed(2)
    console.log(`| ${trait} | ${winrate}% | ${stats.appearances} |`)
})

console.log("\n| Weapon | Winrate | Appearances |")
console.log("| :--- | :--- | :--- |")
Object.entries(weaponStats).sort((a, b) => (b[1].wins / b[1].appearances) - (a[1].wins / a[1].appearances)).forEach(([weapon, stats]) => {
    const winrate = (stats.wins / stats.appearances * 100).toFixed(2)
    console.log(`| ${weapon} | ${winrate}% | ${stats.appearances} |`)
})

console.log("\nStat efficiency (Higher is better influence on win):")
Object.entries(statStats).forEach(([stat, data]) => {
    const efficiency = (data.wins / data.totalValue * 100).toFixed(2)
    console.log(`- ${stat.toUpperCase()}: ${efficiency}`)
})

console.log("\n--- TRAIT MATCHUP MATRIX (Winrate of Row vs Col) ---")
process.stdout.write("| Trait | " + traitsList.join(" | ") + " |\n")
process.stdout.write("| :--- | " + traitsList.map(() => "---").join(" | ") + " |\n")

traitsList.forEach(t1 => {
    process.stdout.write(`| ${t1} | `)
    traitsList.forEach(t2 => {
        if (t1 === t2) {
            process.stdout.write("- | ")
        } else {
            const stats = traitMatchups[t1][t2]
            const winrate = stats.games > 0 ? (stats.wins / stats.games * 100).toFixed(1) : "0"
            process.stdout.write(`${winrate}% | `)
        }
    })
    process.stdout.write("\n")
})
