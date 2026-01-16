import { MobData, MobActionResult, MobListResult, SaveLoadResult, MobStatus, MobStats, MobSkin, CombatStats } from '../shared/types'

const STORAGE_KEY = 'tamagotchi_mobs_save'
const BIOME_STORAGE_KEY = 'tamagotchi_biome_save'

const POSSIBLE_TRAITS = [
    'Sprint Final',
    'Peau de Cuir',
    'Contre-attaque',
    'Appel de l\'Astico-Roi',
    'Main de Dentelle',
    'Berzerk'
]

/**
 * Classe Mob - Logique métier portée pour le web
 */
export class Mob {
    id: string
    nom: string
    imageUrl: string
    vie: number
    energie: number
    status: MobStatus
    stats: MobStats
    level: number
    experience: number
    statPoints: number
    traits: string[]
    skin: MobSkin
    combatProgress: CombatStats

    constructor(
        nom: string,
        imageUrl: string,
        vie: number = 100,
        energie: number = 100,
        id?: string,
        stats?: MobStats,
        traits?: string[],
        skin?: MobSkin,
        combatProgress?: CombatStats,
        level: number = 1,
        experience: number = 0,
        statPoints: number = 0
    ) {
        this.id = id || crypto.randomUUID()
        this.nom = nom
        this.imageUrl = imageUrl
        this.vie = vie
        this.energie = energie
        this.status = vie > 0 ? 'vivant' : 'mort'
        this.level = level
        this.experience = experience
        this.statPoints = statPoints

        if (stats) {
            this.stats = stats
        } else {
            const pointsToDistribute = 40
            const r1 = Math.random(), r2 = Math.random(), r3 = Math.random(), r4 = Math.random()
            const sum = r1 + r2 + r3 + r4
            this.stats = {
                force: 5 + Math.floor((r1 / sum) * pointsToDistribute),
                vitalite: 5 + Math.floor((r2 / sum) * pointsToDistribute),
                vitesse: 5 + Math.floor((r3 / sum) * pointsToDistribute),
                agilite: 5 + Math.floor((r4 / sum) * pointsToDistribute)
            }
            const currentSum = this.stats.force + this.stats.vitalite + this.stats.vitesse + this.stats.agilite
            const diff = 60 - currentSum
            if (diff > 0) this.stats.force += diff
        }

        const maxHP = 100 + (this.stats.vitalite * 5)
        if (!id) this.vie = maxHP

        this.traits = traits || this.generateRandomTraits()
        this.skin = skin || { hat: 'none', bottom: 'none' }
        this.combatProgress = combatProgress || { wins: 0, losses: 0, winStreak: 0 }
    }

    private generateRandomTraits(): string[] {
        const traits: string[] = []
        const available = [...POSSIBLE_TRAITS]
        for (let i = 0; i < 3; i++) {
            const index = Math.floor(Math.random() * available.length)
            traits.push(available.splice(index, 1)[0])
        }
        return traits
    }

    public updateStatus(): void {
        this.status = this.vie > 0 ? 'vivant' : 'mort'
    }

    public getMaxHP(): number {
        return 100 + (this.stats.vitalite * 5)
    }

    takeDamage(amount: number): boolean {
        const wasAlive = this.status === 'vivant'
        this.vie = Math.max(0, this.vie - amount)
        this.updateStatus()
        return wasAlive && this.status === 'mort'
    }

    heal(amount: number): boolean {
        if (this.status === 'mort') return false
        this.vie = Math.min(this.getMaxHP(), this.vie + amount)
        this.updateStatus()
        return true
    }

    revive(): boolean {
        if (this.status === 'vivant') return false
        this.vie = Math.floor(this.getMaxHP() / 2)
        this.energie = 50
        this.updateStatus()
        return true
    }

    rename(newName: string): void {
        this.nom = newName
    }

    gainExperience(amount: number): boolean {
        if (this.status === 'mort') return false
        this.experience += amount
        const xpNeeded = Math.floor(100 * Math.pow(1.5, this.level - 1))
        if (this.experience >= xpNeeded) {
            this.experience -= xpNeeded
            this.level++
            this.statPoints++
            return true
        }
        return false
    }

    toJSON(): MobData {
        return {
            id: this.id,
            nom: this.nom,
            imageUrl: this.imageUrl,
            vie: this.vie,
            energie: this.energie,
            status: this.status,
            stats: this.stats,
            level: this.level,
            experience: this.experience,
            statPoints: this.statPoints,
            traits: this.traits,
            skin: this.skin,
            combatProgress: this.combatProgress
        }
    }

    static fromJSON(data: MobData): Mob {
        const mob = new Mob(
            data.nom, data.imageUrl, data.vie, data.energie, data.id,
            data.stats, data.traits, data.skin, data.combatProgress,
            data.level, data.experience, data.statPoints
        )
        mob.status = data.status
        return mob
    }
}

class WebMobManagerClass {
    private mobs: Map<string, Mob> = new Map()

    createMob(nom: string, imageUrl: string): MobData {
        const uniqueName = this.getUniqueName(nom)
        const mob = new Mob(uniqueName, imageUrl)
        this.mobs.set(mob.id, mob)
        return mob.toJSON()
    }

    deleteMob(id: string): boolean {
        const mob = this.mobs.get(id)
        if (!mob || mob.status !== 'mort') return false
        return this.mobs.delete(id)
    }

    getMobById(id: string): MobData | null {
        return this.mobs.get(id)?.toJSON() || null
    }

    getAllMobs(): MobData[] {
        return Array.from(this.mobs.values()).map(m => m.toJSON())
    }

    damageMob(id: string, amount: number): MobActionResult {
        const mob = this.mobs.get(id)
        if (!mob) return { success: false, error: 'Mob non trouvé' }
        const justDied = mob.takeDamage(amount)
        if (!justDied) mob.gainExperience(5)
        return { success: true, mob: mob.toJSON(), error: justDied ? 'died' : undefined }
    }

    healMob(id: string, amount: number): MobActionResult {
        const mob = this.mobs.get(id)
        if (!mob) return { success: false, error: 'Mob non trouvé' }
        const healed = mob.heal(amount)
        return { success: healed, mob: mob.toJSON(), changed: healed }
    }

    reviveMob(id: string): MobActionResult {
        const mob = this.mobs.get(id)
        if (!mob) return { success: false, error: 'Mob non trouvé' }
        const revived = mob.revive()
        return { success: revived, mob: mob.toJSON(), changed: revived }
    }

    renameMob(id: string, newName: string): MobActionResult {
        const mob = this.mobs.get(id)
        if (!mob) return { success: false, error: 'Mob non trouvé' }
        mob.rename(this.getUniqueName(newName, id))
        return { success: true, mob: mob.toJSON() }
    }

    processCombatResult(winnerData: MobData, loserData: MobData): { winner: MobData, reward?: string } {
        const winner = this.mobs.get(winnerData.id)
        const loser = this.mobs.get(loserData.id)
        if (loser) {
            loser.vie = loserData.vie
            loser.energie = loserData.energie
            loser.updateStatus()
        }
        let reward: string | undefined
        if (winner) {
            winner.vie = winnerData.vie
            winner.energie = winnerData.energie
            winner.updateStatus()
            winner.combatProgress.wins++
            winner.combatProgress.winStreak++
            winner.gainExperience(50)
            if (winner.combatProgress.winStreak >= 5) {
                reward = 'Fiole de Réanimation'
                winner.combatProgress.winStreak = 0
            }
        }
        return { winner: winner?.toJSON() || winnerData, reward }
    }

    private getUniqueName(baseName: string, excludeId?: string): string {
        let name = baseName, counter = 2
        while (Array.from(this.mobs.values()).some(m => m.id !== excludeId && m.nom === name)) {
            name = `${baseName} ${counter++}`
        }
        return name
    }

    saveMobs(): SaveLoadResult {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.getAllMobs()))
            return { success: true, path: 'localStorage' }
        } catch (e) { return { success: false, error: String(e) } }
    }

    loadMobs(): MobListResult {
        try {
            const data = localStorage.getItem(STORAGE_KEY)
            if (!data) return { success: false, error: 'Aucune sauvegarde trouvée' }
            this.mobs.clear()
            JSON.parse(data).forEach((d: MobData) => this.mobs.set(d.id, Mob.fromJSON(d)))
            return { success: true, mobs: this.getAllMobs() }
        } catch (e) { return { success: false, error: String(e) } }
    }

    saveBiome(data: any[]): SaveLoadResult {
        try {
            localStorage.setItem(BIOME_STORAGE_KEY, JSON.stringify(data))
            return { success: true, path: 'localStorage/biome' }
        } catch (e) { return { success: false, error: String(e) } }
    }

    loadBiome(): { success: boolean, data?: any[] } {
        try {
            const data = localStorage.getItem(BIOME_STORAGE_KEY)
            return { success: true, data: data ? JSON.parse(data) : undefined }
        } catch (e) { return { success: false } }
    }
}

export const WebMobManager = new WebMobManagerClass()
