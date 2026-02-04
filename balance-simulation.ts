/**
 * SIMULATION D'ÉQUILIBRAGE - Level-Up Choices
 * 
 * Compare l'impact de différents choix de level-up:
 * - Stats pures (+1 actuellement)
 * - Armes (bonus variables + effets)
 * - Traits (effets spéciaux)
 */

// --- MOCK DATA ---
interface Stats {
    force: number
    vitalite: number
    agilite: number
    vitesse: number
}

interface Fighter {
    name: string
    stats: Stats
    weapons: string[]
    traits: string[]
}

// Weapon data (from WeaponRegistry)
const WEAPONS = {
    'Cure-dent': { damageBonus: 2, effects: {} },
    'Fourchette': { damageBonus: 4, effects: { counterChance: 0.25 } },
    'Capsule': { damageBonus: 1, statBonus: { vitalite: 5 }, effects: { blockChance: 0.30, stunChance: 0.15 } },
    'Cutter': { damageBonus: 7, effects: {} }
}

// --- COMBAT SIMULATOR ---
function simulateCombat(fighter1: Fighter, fighter2: Fighter, rounds: number = 1000): { f1Wins: number, f2Wins: number, avgTurns: number } {
    let f1Wins = 0
    let f2Wins = 0
    let totalTurns = 0

    for (let i = 0; i < rounds; i++) {
        const result = singleCombat(fighter1, fighter2)
        if (result.winner === 1) f1Wins++
        else f2Wins++
        totalTurns += result.turns
    }

    return {
        f1Wins,
        f2Wins,
        avgTurns: totalTurns / rounds
    }
}

function singleCombat(f1: Fighter, f2: Fighter): { winner: 1 | 2, turns: number } {
    let hp1 = 100 + (f1.stats.vitalite * 5)
    let hp2 = 100 + (f2.stats.vitalite * 5)

    // Add weapon stat bonuses
    f1.weapons.forEach(w => {
        const weapon = WEAPONS[w as keyof typeof WEAPONS]
        if (weapon?.statBonus) {
            hp1 += weapon.statBonus.vitalite * 5
        }
    })
    f2.weapons.forEach(w => {
        const weapon = WEAPONS[w as keyof typeof WEAPONS]
        if (weapon?.statBonus) {
            hp2 += weapon.statBonus.vitalite * 5
        }
    })

    let turns = 0
    const maxTurns = 100 // Safety limit

    while (hp1 > 0 && hp2 > 0 && turns < maxTurns) {
        turns++

        // F1 attacks
        const damage1 = calculateDamage(f1, f2)
        hp2 -= damage1

        if (hp2 <= 0) return { winner: 1, turns }

        // F2 attacks
        const damage2 = calculateDamage(f2, f1)
        hp1 -= damage2

        if (hp1 <= 0) return { winner: 2, turns }
    }

    // Timeout - whoever has more HP wins
    return { winner: hp1 > hp2 ? 1 : 2, turns }
}

function calculateDamage(attacker: Fighter, defender: Fighter): number {
    const baseDamage = 10 + (attacker.stats.force * 2)
    
    // Weapon bonus
    let weaponBonus = 0
    if (attacker.weapons.length > 0) {
        const weapon = WEAPONS[attacker.weapons[0] as keyof typeof WEAPONS]
        weaponBonus = weapon?.damageBonus || 0
    }

    // Simple damage calculation (ignoring effects for this simulation)
    const totalDamage = baseDamage + weaponBonus

    return totalDamage
}

// --- SIMULATION SCENARIOS ---

// Baseline: Level 1 potato
const baseline: Fighter = {
    name: 'Baseline (Lvl 1)',
    stats: { force: 10, vitalite: 10, agilite: 10, vitesse: 10 },
    weapons: [],
    traits: []
}

// Scenario 1: 3 Stats +1 (current system)
const stats1: Fighter = {
    name: '+3 Stats (+1 each)',
    stats: { force: 11, vitalite: 11, agilite: 10, vitesse: 11 },
    weapons: [],
    traits: []
}

// Scenario 2: 3 Stats +2 (proposed)
const stats2: Fighter = {
    name: '+6 Stats (+2 each)',
    stats: { force: 12, vitalite: 12, agilite: 10, vitesse: 12 },
    weapons: [],
    traits: []
}

// Scenario 3: 3 Stats +3 (proposed aggressive)
const stats3: Fighter = {
    name: '+9 Stats (+3 each)',
    stats: { force: 13, vitalite: 13, agilite: 10, vitesse: 13 },
    weapons: [],
    traits: []
}

// Scenario 4: 3 Weapons
const weapons3: Fighter = {
    name: '3 Weapons',
    stats: { force: 10, vitalite: 10, agilite: 10, vitesse: 10 },
    weapons: ['Cure-dent', 'Fourchette', 'Cutter'], // Total: +13 damage
    traits: []
}

// Scenario 5: 2 Weapons + 1 Stat
const mixed1: Fighter = {
    name: '2 Weapons + 1 Stat',
    stats: { force: 11, vitalite: 10, agilite: 10, vitesse: 10 },
    weapons: ['Fourchette', 'Cutter'], // +11 damage
    traits: []
}

// Scenario 6: 1 Strong Weapon (Cutter)
const oneWeapon: Fighter = {
    name: '1 Weapon (Cutter)',
    stats: { force: 10, vitalite: 10, agilite: 10, vitesse: 10 },
    weapons: ['Cutter'], // +7 damage
    traits: []
}

// --- RUN SIMULATIONS ---
console.log('=== SIMULATION D\'ÉQUILIBRAGE ===\n')

const scenarios = [
    { name: 'Stats +1 (actuel) vs Baseline', f1: stats1, f2: baseline },
    { name: 'Stats +2 (proposé) vs Baseline', f1: stats2, f2: baseline },
    { name: 'Stats +3 (agressif) vs Baseline', f1: stats3, f2: baseline },
    { name: '3 Weapons vs Baseline', f1: weapons3, f2: baseline },
    { name: '1 Weapon (Cutter) vs Baseline', f1: oneWeapon, f2: baseline },
    { name: '', f1: baseline, f2: baseline }, // Separator
    { name: 'Stats +1 vs 3 Weapons', f1: stats1, f2: weapons3 },
    { name: 'Stats +2 vs 3 Weapons', f1: stats2, f2: weapons3 },
    { name: 'Stats +3 vs 3 Weapons', f1: stats3, f2: weapons3 },
    { name: '', f1: baseline, f2: baseline }, // Separator
    { name: 'Stats +2 vs 1 Weapon (Cutter)', f1: stats2, f2: oneWeapon },
    { name: 'Stats +3 vs 1 Weapon (Cutter)', f1: stats3, f2: oneWeapon },
    { name: '2 Weapons+Stat vs Stats +2', f1: mixed1, f2: stats2 },
]

scenarios.forEach(scenario => {
    if (!scenario.name) {
        console.log('')
        return
    }

    const result = simulateCombat(scenario.f1, scenario.f2, 1000)
    const winRate = ((result.f1Wins / 1000) * 100).toFixed(1)
    
    console.log(`${scenario.name}:`)
    console.log(`  ${scenario.f1.name}: ${result.f1Wins} wins (${winRate}%)`)
    console.log(`  ${scenario.f2.name}: ${result.f2Wins} wins (${(100 - parseFloat(winRate)).toFixed(1)}%)`)
    console.log(`  Avg Combat Duration: ${result.avgTurns.toFixed(1)} turns`)
    console.log('')
})

// --- ANALYSIS ---
console.log('=== ANALYSE ===\n')
console.log('Équivalences approximatives:')
console.log('- +1 Force = ~+2 dégâts par tour')
console.log('- +1 Vitalité = ~+5 HP')
console.log('- Cure-dent = +2 dégâts permanent')
console.log('- Fourchette = +4 dégâts + 25% counter')
console.log('- Cutter = +7 dégâts')
console.log('')
console.log('Recommandation:')
console.log('- Stats +2 ou +3 semble plus équilibré face aux armes')
console.log('- Stats +1 est trop faible comparé à même une arme basique')
console.log('- Une arme forte (Cutter +7) = environ 3-4 stats en valeur')
