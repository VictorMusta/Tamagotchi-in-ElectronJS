import { writeFileSync, createWriteStream } from 'fs';
import { randomUUID } from 'crypto';
import { MobData, MobStats } from './src/shared/types';
import { WEAPON_REGISTRY } from './src/shared/WeaponRegistry';
import { TRAIT_DEFINITIONS } from './src/renderer/src/mob/TraitDefinitions';

// --- CONFIGURATION ---
const POTATO_COUNT = 1000;
const POTATOES_FILE = 'potatoes.csv';
const MATCHES_FILE = 'matches.csv';

const POSSIBLE_TRAITS = Object.keys(TRAIT_DEFINITIONS);
const WEAPON_KEYS = Object.keys(WEAPON_REGISTRY);

// --- HEADLESS COMBAT ENGINE (Optimized for Simulation) ---
interface CombatMob extends MobData {
    activeWeapon?: string;
    inventory: string[];
}

class HeadlessCombatEngine {
    private f1: CombatMob;
    private f2: CombatMob;
    private energy1: number = 0;
    private energy2: number = 0;
    private maggotEnergy1: number = 0;
    private maggotEnergy2: number = 0;
    private essaimEnergy1: number = 0;
    private essaimEnergy2: number = 0;
    private spiritEnergy1: number = 0;
    private spiritEnergy2: number = 0;
    private consecutiveHitsTaken1: number = 0;
    private consecutiveHitsTaken2: number = 0;
    private isBerzerk1: boolean = false;
    private isBerzerk2: boolean = false;
    private isStunned1: boolean = false;
    private isStunned2: boolean = false;
    private guardianHp1: number = 0;
    private guardianHp2: number = 0;
    private blindDuration1: number = 0;
    private blindDuration2: number = 0;
    private readonly MAX_ENERGY = 100;

    constructor(p1: MobData, p2: MobData) {
        this.f1 = { ...p1, activeWeapon: undefined, inventory: [...p1.weapons] };
        this.f2 = { ...p2, activeWeapon: undefined, inventory: [...p2.weapons] };

        if (this.hasTrait(this.f1, 'Gardien de Racine')) {
            this.guardianHp1 = Math.floor((100 + this.f1.stats.vitalite * 10) * 0.5);
        }
        if (this.hasTrait(this.f2, 'Gardien de Racine')) {
            this.guardianHp2 = Math.floor((100 + this.f2.stats.vitalite * 10) * 0.5);
        }
    }

    run(): string {
        while (this.f1.vie > 0 && this.f2.vie > 0) {
            // Energy accumulation
            while (this.energy1 < this.MAX_ENERGY && this.energy2 < this.MAX_ENERGY &&
                this.maggotEnergy1 < this.MAX_ENERGY && this.maggotEnergy2 < this.MAX_ENERGY &&
                this.essaimEnergy1 < this.MAX_ENERGY && this.essaimEnergy2 < this.MAX_ENERGY &&
                this.spiritEnergy1 < this.MAX_ENERGY && this.spiritEnergy2 < this.MAX_ENERGY) {
                
                this.energy1 += this.getSpeed(this.f1);
                this.energy2 += this.getSpeed(this.f2);
                
                if (this.hasTrait(this.f1, "Appel de l'Astico-Roi")) this.maggotEnergy1 += this.getSpeed(this.f1) * 0.4;
                if (this.hasTrait(this.f2, "Appel de l'Astico-Roi")) this.maggotEnergy2 += this.getSpeed(this.f2) * 0.4;
                if (this.hasTrait(this.f1, "Essaim de Moucherons")) this.essaimEnergy1 += this.getSpeed(this.f1) * 1.5;
                if (this.hasTrait(this.f2, "Essaim de Moucherons")) this.essaimEnergy2 += this.getSpeed(this.f2) * 1.5;
                if (this.hasTrait(this.f1, "Esprit Saboteur")) this.spiritEnergy1 += this.getSpeed(this.f1) * 2.0;
                if (this.hasTrait(this.f2, "Esprit Saboteur")) this.spiritEnergy2 += this.getSpeed(this.f2) * 2.0;
            }

            // Action resolution
            if (this.energy1 >= this.MAX_ENERGY) {
                if (!this.isStunned1) this.performAction(this.f1, this.f2); else this.isStunned1 = false;
                this.energy1 -= this.MAX_ENERGY;
            } else if (this.energy2 >= this.MAX_ENERGY) {
                if (!this.isStunned2) this.performAction(this.f2, this.f1); else this.isStunned2 = false;
                this.energy2 -= this.MAX_ENERGY;
            } else if (this.maggotEnergy1 >= this.MAX_ENERGY) {
                this.performMaggotAction(this.f1, this.f2); this.maggotEnergy1 -= this.MAX_ENERGY;
            } else if (this.maggotEnergy2 >= this.MAX_ENERGY) {
                this.performMaggotAction(this.f2, this.f1); this.maggotEnergy2 -= this.MAX_ENERGY;
            } else if (this.essaimEnergy1 >= this.MAX_ENERGY) {
                this.performEssaimAction(this.f1, this.f2); this.essaimEnergy1 -= this.MAX_ENERGY;
            } else if (this.essaimEnergy2 >= this.MAX_ENERGY) {
                this.performEssaimAction(this.f2, this.f1); this.essaimEnergy2 -= this.MAX_ENERGY;
            } else if (this.spiritEnergy1 >= this.MAX_ENERGY) {
                this.performSpiritAction(this.f1, this.f2); this.spiritEnergy1 -= this.MAX_ENERGY;
            } else if (this.spiritEnergy2 >= this.MAX_ENERGY) {
                this.performSpiritAction(this.f2, this.f1); this.spiritEnergy2 -= this.MAX_ENERGY;
            }
        }
        return this.f1.vie <= 0 ? this.f2.id : this.f1.id;
    }

    private getSpeed(mob: CombatMob): number {
        const maxHp = 100 + (mob.stats.vitalite * 10);
        let speed = mob.stats.vitesse;
        if (mob.vie < maxHp * 0.2 && this.hasTrait(mob, 'Sprint Final')) speed *= 2;
        return speed;
    }

    private hasTrait(mob: CombatMob, trait: string): boolean {
        return mob.traits.includes(trait);
    }

    private performAction(attacker: CombatMob, defender: CombatMob) {
        // Weapon draw
        if (!attacker.activeWeapon && attacker.inventory.length > 0 && Math.random() < 0.3) {
            attacker.activeWeapon = attacker.inventory.splice(Math.floor(Math.random() * attacker.inventory.length), 1)[0];
        }

        // Weapon throw
        if (attacker.activeWeapon && Math.random() < 0.2) {
            this.throwWeapon(attacker, defender);
            return;
        }

        const attWeapon = WEAPON_REGISTRY[attacker.activeWeapon || ''];
        const defWeapon = WEAPON_REGISTRY[defender.activeWeapon || ''];

        // Counter check
        if (attWeapon?.type === 'short' && defWeapon?.type === 'long') {
            if (Math.random() < (defWeapon.effects?.counterChance || 0.25)) {
                this.triggerCounterAttack(defender, attacker);
                return;
            }
        }

        const attackCount = (this.isBerzerk(attacker)) ? 2 : 1;
        for (let i = 0; i < attackCount; i++) {
            const hit = this.calculateHit(attacker, defender);
            if (hit.isHit) {
                this.applyDamage(attacker, defender, hit.damage);
                this.handleOnHitEvents(defender, attacker);
                // Durability check
                if (attacker.activeWeapon) {
                    const dropChance = attWeapon?.type === 'short' ? 0.05 : (attWeapon?.type === 'long' ? 0.15 : 0.10);
                    if (Math.random() < dropChance) attacker.activeWeapon = undefined;
                }
                // Stun check
                if (attWeapon?.effects?.stunChance && Math.random() < attWeapon.effects.stunChance) {
                    if (defender.id === this.f1.id) this.isStunned1 = true; else this.isStunned2 = true;
                }
            } else {
                this.handleOnHitEvents(defender, attacker);
            }
        }
    }

    private throwWeapon(attacker: CombatMob, defender: CombatMob) {
        let damage = attacker.stats.force;
        const weapon = WEAPON_REGISTRY[attacker.activeWeapon || ''];
        if (weapon) damage += weapon.damageBonus;
        damage = Math.floor(damage * 1.05);
        if (this.calculateHit(attacker, defender).isHit) {
            this.applyDamage(attacker, defender, damage);
            this.handleOnHitEvents(defender, attacker);
        }
        attacker.activeWeapon = undefined;
    }

    private applyDamage(source: CombatMob, target: CombatMob, damage: number) {
        let finalDamage = damage;
        const isF1 = target.id === this.f1.id;
        const gHp = isF1 ? this.guardianHp1 : this.guardianHp2;
        if (gHp > 0) {
            const absorbed = Math.floor(finalDamage * 0.15);
            const actualAbsorbed = Math.min(absorbed, gHp);
            finalDamage -= actualAbsorbed;
            if (isF1) this.guardianHp1 -= actualAbsorbed; else this.guardianHp2 -= actualAbsorbed;
        }
        target.vie -= finalDamage;
    }

    private calculateHit(attacker: CombatMob, defender: CombatMob) {
        const isF1 = attacker.id === this.f1.id;
        const blindDebuff = (isF1 ? this.blindDuration1 : this.blindDuration2) > 0 ? 5 : 0;
        const dodgeChance = 0.1 + (defender.stats.agilite - (attacker.stats.agilite - blindDebuff)) * 0.02;
        if (blindDebuff > 0) { if (isF1) this.blindDuration1--; else this.blindDuration2--; }
        
        if (Math.random() < Math.max(0.05, dodgeChance)) return { isHit: false, damage: 0 };
        
        let damage = attacker.stats.force + Math.floor(Math.random() * 5);
        const weapon = WEAPON_REGISTRY[attacker.activeWeapon || ''];
        if (weapon) damage += weapon.damageBonus;
        if (Math.random() < (this.hasTrait(attacker, 'Coup Critique') ? 0.33 : 0.1)) damage *= 2;

        damage = this.calculateDamageReduction(defender, damage);
        if (this.isBerzerk(attacker)) damage = Math.floor(damage * 0.7);

        return { isHit: true, damage };
    }

    private calculateDamageReduction(defender: CombatMob, incomeDamage: number): number {
        let reduction = this.hasTrait(defender, 'Peau de Cuir') ? 0.1 : 0;
        const weapon = WEAPON_REGISTRY[defender.activeWeapon || ''];
        if (weapon?.type === 'shield' && Math.random() < (weapon.effects?.blockChance || 0)) reduction += 0.5;
        return Math.floor(incomeDamage * (1 - reduction));
    }

    private handleOnHitEvents(victim: CombatMob, source: CombatMob) {
        if (!victim.activeWeapon && source.activeWeapon) {
            victim.activeWeapon = source.activeWeapon;
            source.activeWeapon = undefined;
        }
        if (this.hasTrait(victim, 'Berzerk')) {
            if (victim.id === this.f1.id) {
                this.consecutiveHitsTaken1++; if (this.consecutiveHitsTaken1 >= 3) this.isBerzerk1 = true;
            } else {
                this.consecutiveHitsTaken2++; if (this.consecutiveHitsTaken2 >= 3) this.isBerzerk2 = true;
            }
        }
        if (this.hasTrait(victim, 'Contre-attaque') && Math.random() < 0.10) {
            this.triggerCounterAttack(victim, source);
        }
    }

    private triggerCounterAttack(attacker: CombatMob, target: CombatMob) {
        const damage = attacker.stats.force;
        this.applyDamage(attacker, target, this.calculateDamageReduction(target, damage));
    }

    private performMaggotAction(owner: CombatMob, target: CombatMob) {
        const damage = this.calculateDamageReduction(target, 5 + Math.floor(Math.random() * 5));
        this.applyDamage(owner, target, damage);
        this.handleOnHitEvents(target, owner);
    }

    private performEssaimAction(owner: CombatMob, target: CombatMob) {
        const damage = 2 + Math.floor(Math.random() * 2);
        this.applyDamage(owner, target, this.calculateDamageReduction(target, damage));
        if (Math.random() < 0.30) {
            if (target.id === this.f1.id) this.blindDuration1++; else this.blindDuration2++;
        }
        this.handleOnHitEvents(target, owner);
    }

    private performSpiritAction(owner: CombatMob, target: CombatMob) {
        const rand = Math.random();
        if (rand < 0.50 && target.activeWeapon) {
            target.activeWeapon = undefined;
        } else if (target.inventory.length > 0) {
            const index = Math.floor(Math.random() * target.inventory.length);
            const oldWeapon = target.activeWeapon;
            target.activeWeapon = target.inventory.splice(index, 1)[0];
            if (oldWeapon) target.inventory.push(oldWeapon);
        } else {
            this.applyDamage(owner, target, 2 + Math.floor(Math.random() * 2));
        }
        this.handleOnHitEvents(target, owner);
    }

    private isBerzerk(mob: CombatMob): boolean {
        return mob.id === this.f1.id ? this.isBerzerk1 : this.isBerzerk2;
    }
}

// --- POTATO GENERATOR ---
function generatePotato(idx: number): MobData {
    const id = `potato_${idx}`;
    // Base stats distribution (60 points total)
    const stats: MobStats = { force: 5, vitesse: 5, agilite: 5, vitalite: 5 };
    const pointsToDistribute = 40;
    const weights = [Math.random(), Math.random(), Math.random(), Math.random()];
    const sum = weights.reduce((a, b) => a + b, 0);
    
    stats.force += Math.floor((weights[0] / sum) * pointsToDistribute);
    stats.vitesse += Math.floor((weights[1] / sum) * pointsToDistribute);
    stats.agilite += Math.floor((weights[2] / sum) * pointsToDistribute);
    stats.vitalite += Math.floor((weights[3] / sum) * pointsToDistribute);
    
    // Correction to 60
    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    stats.force += (60 - total);

    const potato: MobData = {
        id,
        nom: `Potato #${idx}`,
        imageUrl: '',
        vie: 100 + stats.vitalite * 10,
        energie: 100,
        status: 'vivant',
        stats,
        level: 1,
        experience: 0,
        statPoints: 0,
        traits: [],
        skin: { hat: 'none' },
        combatProgress: { wins: 0, losses: 0, winStreak: 0, tournamentWins: 0 },
        inSquad: true,
        weapons: [],
        hpMultiplier: 10,
        isInOnsen: false,
        lastOnsenEntryTimestamp: null,
        hpAtOnsenEntry: null
    };

    // Initial mutations (up to 3)
    const availableTraits = [...POSSIBLE_TRAITS];
    for (let i = 0; i < 3; i++) {
        if (Math.random() < 0.3 && availableTraits.length > 0) {
            const index = Math.floor(Math.random() * availableTraits.length);
            potato.traits.push(availableTraits.splice(index, 1)[0]);
        }
    }

    // Level up to 5
    for (let l = 1; l < 5; l++) {
        const choiceType = Math.random();
        const statKeys: (keyof MobStats)[] = ['force', 'vitesse', 'agilite', 'vitalite'];
        if (choiceType < 0.33) { // Stat +2
            potato.stats[statKeys[Math.floor(Math.random() * 4)]] += 2;
        } else if (choiceType < 0.66) { // Weapon
            const availWeapons = WEAPON_KEYS.filter(w => !potato.weapons.includes(w));
            if (availWeapons.length > 0) {
                const wName = availWeapons[Math.floor(Math.random() * availWeapons.length)];
                potato.weapons.push(wName);
                const wDef = WEAPON_REGISTRY[wName];
                if (wDef?.statBonus) potato.stats[wDef.statBonus.stat as keyof MobStats] += wDef.statBonus.amount;
            } else {
                 potato.stats[statKeys[Math.floor(Math.random() * 4)]] += 2;
            }
        } else { // Trait
            const availTraits = POSSIBLE_TRAITS.filter(t => !potato.traits.includes(t));
            if (availTraits.length > 0 && potato.traits.length < 6) {
                potato.traits.push(availTraits[Math.floor(Math.random() * availTraits.length)]);
            } else {
                 potato.stats[statKeys[Math.floor(Math.random() * 4)]] += 2;
            }
        }
        potato.vie = 100 + potato.stats.vitalite * 10;
        potato.level++;
    }

    return potato;
}

// --- MAIN EXECUTION ---
async function main() {
    console.log(`Generating ${POTATO_COUNT} potatoes...`);
    const potatoes: MobData[] = [];
    const potatoStream = createWriteStream(POTATOES_FILE);
    potatoStream.write("id,name,force,vitesse,agilite,vitalite,level,traits,weapons\n");

    for (let i = 0; i < POTATO_COUNT; i++) {
        const p = generatePotato(i);
        potatoes.push(p);
        const row = `${p.id},\"${p.nom}\",${p.stats.force},${p.stats.vitesse},${p.stats.agilite},${p.stats.vitalite},${p.level},\"${p.traits.join('|')}\",\"${p.weapons.join('|')}\"\n`;
        
        if (!potatoStream.write(row)) {
            await new Promise<void>(resolve => potatoStream.once('drain', () => resolve()));
        }

        if (i % 1000 === 0 && i > 0) {
            console.log(`Generated ${i} potatoes...`);
        }
    }
    potatoStream.end();
    console.log(`Saved ${POTATOES_FILE}`);

    console.log(`Starting Round-Robin Tournament (~50M matches)...`);
    const matchStream = createWriteStream(MATCHES_FILE, { highWaterMark: 1024 * 1024 }); // 1MB buffer
    matchStream.write("id_p1,id_p2,winner_id\n");

    const startTime = Date.now();
    let matchCount = 0;

    for (let i = 0; i < POTATO_COUNT; i++) {
        for (let j = i + 1; j < POTATO_COUNT; j++) {
            const engine = new HeadlessCombatEngine(potatoes[i], potatoes[j]);
            const winnerId = engine.run();
            
            const line = `${potatoes[i].id},${potatoes[j].id},${winnerId}\n`;
            if (!matchStream.write(line)) {
                await new Promise<void>(resolve => matchStream.once('drain', () => resolve()));
            }
            matchCount++;

            if (matchCount % 100000 === 0) {
                const elapsed = (Date.now() - startTime) / 1000;
                const speed = matchCount / elapsed;
                const totalEstimated = (POTATO_COUNT * (POTATO_COUNT - 1)) / 2;
                const remaining = (totalEstimated - matchCount) / speed;
                console.log(`Matches: ${matchCount} | Speed: ${speed.toFixed(0)} m/s | ETA: ${(remaining / 60).toFixed(1)}m`);
            }
        }
    }

    matchStream.end();
    console.log(`\nSimulation complete!`);
    console.log(`Total Matches: ${matchCount}`);
    console.log(`Duration: ${((Date.now() - startTime) / 60000).toFixed(2)} minutes`);
}

main().catch(console.error);
