import { MobData, MobActionResult, MobListResult, SaveLoadResult, MobStatus, MobStats, MobSkin, CombatStats, TournamentResult, TournamentData, TournamentHistory } from '../shared/types'

const STORAGE_KEY = 'tamagotchi_mobs_save'
const BIOME_STORAGE_KEY = 'tamagotchi_biome_save'
const TOURNAMENT_STORAGE_KEY = 'tamagotchi_tournament_save'
const TOURNAMENT_HISTORY_KEY = 'tamagotchi_tournament_history'

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
    inSquad: boolean

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
        inSquad: boolean = false,
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

        // Always full health in Hub
        this.vie = this.getMaxHP()
        this.energie = 100
        this.updateStatus()

        this.traits = traits || this.generateRandomTraits()
        this.skin = skin || { hat: 'none', bottom: 'none' }
        this.combatProgress = combatProgress || { wins: 0, losses: 0, winStreak: 0, tournamentWins: 0 }
        if (typeof this.combatProgress.tournamentWins !== 'number') this.combatProgress.tournamentWins = 0

        this.inSquad = inSquad
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
        const xpNeeded = this.targetXpForNextLevel()
        if (this.experience >= xpNeeded) {
            this.experience -= xpNeeded
            this.level++
            this.statPoints++
            return true
        }
        return false
    }

    targetXpForNextLevel(): number {
        return Math.floor(100 * Math.pow(1.5, this.level - 1))
    }

    upgradeStat(statName: keyof MobStats, amount: number): void {
        this.stats[statName] += amount
        if (statName === 'vitalite') {
            this.vie += (amount * 5)
        }
    }

    generateUpgradeChoices(): any[] {
        const choices: any[] = []
        const stats: Array<keyof MobStats> = ['force', 'vitalite', 'vitesse', 'agilite']
        const randomStat = stats[Math.floor(Math.random() * stats.length)]
        const statAmount = 2 + Math.floor(Math.random() * 2)
        const statLabels = { force: 'FOR', vitalite: 'VIT', vitesse: 'SPD', agilite: 'AGI' }

        choices.push({
            type: 'stat',
            stat: randomStat,
            amount: statAmount,
            label: `+${statAmount} ${statLabels[randomStat]}`
        })

        const weapons = ['Épée Rouillée', 'Bâton Noueux', 'Hache Ébréchée', 'Marteau Lourd', 'Dague Acérée']
        const randomWeapon = weapons[Math.floor(Math.random() * weapons.length)]
        choices.push({
            type: 'weapon',
            name: randomWeapon,
            label: randomWeapon
        })

        const availableTraits = POSSIBLE_TRAITS.filter(t => !this.traits.includes(t))
        if (availableTraits.length > 0) {
            const randomTrait = availableTraits[Math.floor(Math.random() * availableTraits.length)]
            choices.push({
                type: 'trait',
                name: randomTrait,
                label: randomTrait,
                description: `Nouveau trait: ${randomTrait}`
            })
        } else {
            const altStat = stats[Math.floor(Math.random() * stats.length)]
            const altAmount = 2 + Math.floor(Math.random() * 2)
            choices.push({
                type: 'stat',
                stat: altStat,
                amount: altAmount,
                label: `+${altAmount} ${statLabels[altStat]}`
            })
        }

        return choices
    }

    applyChoice(choice: any): void {
        if (choice.type === 'stat') {
            this.upgradeStat(choice.stat, choice.amount)
            this.statPoints--
        } else if (choice.type === 'weapon') {
            console.log(`[WebMob] ${this.nom} a obtenu: ${choice.name}`)
        } else if (choice.type === 'trait') {
            if (!this.traits.includes(choice.name)) {
                this.traits.push(choice.name)
                this.statPoints--
            }
        }
    }

    setSkin(type: 'hat' | 'bottom', value: string): void {
        this.skin[type] = value
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
            combatProgress: this.combatProgress,
            inSquad: this.inSquad
        }
    }

    static fromJSON(data: MobData): Mob {
        const mob = new Mob(
            data.nom, data.imageUrl, data.vie, data.energie, data.id,
            data.stats, data.traits, data.skin, data.combatProgress,
            data.inSquad, // new arg
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

        const squadSize = Array.from(this.mobs.values()).filter(m => m.inSquad).length
        const inSquad = squadSize < 10

        const mob = new Mob(uniqueName, imageUrl, 100, 100, undefined, undefined, undefined, undefined, undefined, inSquad)
        this.mobs.set(mob.id, mob)
        this.saveMobs()
        return mob.toJSON()
    }

    toggleSquad(id: string): MobActionResult {
        const mob = this.mobs.get(id)
        if (!mob) return { success: false, error: 'Mob non trouvé' }

        if (mob.inSquad) {
            mob.inSquad = false
        } else {
            const squadSize = Array.from(this.mobs.values()).filter(m => m.inSquad).length
            if (squadSize >= 10) {
                return { success: false, error: 'L\'équipe est complète (10 max)' }
            }
            mob.inSquad = true
        }

        this.saveMobs()
        return { success: true, mob: mob.toJSON() }
    }

    deleteMob(id: string): boolean {
        const mob = this.mobs.get(id)
        if (!mob) return false
        return this.mobs.delete(id)
    }

    getMobById(id: string): MobData | null {
        return this.mobs.get(id)?.toJSON() || null
    }

    getAllMobs(): MobData[] {
        return Array.from(this.mobs.values()).map(m => m.toJSON())
    }

    renameMob(id: string, newName: string): MobActionResult {
        const mob = this.mobs.get(id)
        if (!mob) return { success: false, error: 'Mob non trouvé' }
        mob.rename(this.getUniqueName(newName, id))
        this.saveMobs()
        return { success: true, mob: mob.toJSON() }
    }

    processCombatResult(winnerData: MobData, loserData: MobData): { winner: MobData, loser: MobData, reward?: string } {
        console.log(`[WebMobManager] processCombatResult: Winner=${winnerData.id}, Loser=${loserData.id}`)
        const winner = this.mobs.get(winnerData.id)
        const loser = this.mobs.get(loserData.id)

        if (loser) {
            console.log(`[WebMobManager] Healing loser: ${loser.id}`)
            loser.vie = loser.getMaxHP()
            loser.energie = 100
            loser.updateStatus()
        }

        let reward: string | undefined
        if (winner) {
            console.log(`[WebMobManager] Healing winner: ${winner.id}`)
            winner.vie = winner.getMaxHP()
            winner.energie = 100
            winner.updateStatus()

            winner.combatProgress.wins++
            winner.combatProgress.winStreak++

            if (winner.combatProgress.winStreak >= 5) {
                reward = 'Fiole de Réanimation'
                winner.combatProgress.winStreak = 0
            }

            // Web XP
            winner.gainExperience(50)
        }

        return {
            winner: winner ? winner.toJSON() : { ...winnerData, vie: 100 + (winnerData.stats.vitalite * 5), status: 'vivant' },
            loser: loser ? loser.toJSON() : { ...loserData, vie: 100 + (loserData.stats.vitalite * 5), status: 'vivant' },
            reward
        }
    }

    getMobUpgradeChoices(id: string): { success: boolean, choices: any[], error?: string } {
        const mob = this.mobs.get(id)
        if (!mob) return { success: false, choices: [], error: 'Mob non trouvé' }
        if (mob.statPoints <= 0) return { success: false, choices: [], error: 'Aucun point disponible' }
        return { success: true, choices: mob.generateUpgradeChoices() }
    }

    applyMobUpgrade(id: string, choice: any): MobActionResult {
        const mob = this.mobs.get(id)
        if (!mob) return { success: false, error: 'Mob non trouvé' }
        if (mob.statPoints <= 0) return { success: false, error: 'Aucun point disponible' }
        mob.applyChoice(choice)
        this.saveMobs() // PERSISTENCE
        return { success: true, mob: mob.toJSON() }
    }

    updateMobSkin(id: string, type: 'hat' | 'bottom', value: string): MobActionResult {
        const mob = this.mobs.get(id)
        if (!mob) return { success: false, error: 'Mob non trouvé' }
        mob.setSkin(type, value)
        this.saveMobs() // PERSISTENCE
        return { success: true, mob: mob.toJSON() }
    }

    processTournamentWin(id: string): MobActionResult {
        const mob = this.mobs.get(id)
        if (!mob) return { success: false, error: 'Mob non trouvé' }

        mob.combatProgress.tournamentWins++
        mob.gainExperience(500)
        this.saveMobs()
        return { success: true, mob: mob.toJSON() }
    }

    getTournament(): TournamentResult {
        try {
            const data = localStorage.getItem(TOURNAMENT_STORAGE_KEY)
            if (!data) return { success: true }
            return { success: true, tournament: JSON.parse(data) }
        } catch (e) { return { success: false, error: String(e) } }
    }

    getTournamentHistory(): TournamentHistory {
        try {
            const data = localStorage.getItem(TOURNAMENT_HISTORY_KEY)
            if (!data) return { success: true, tournaments: [] }
            return { success: true, tournaments: JSON.parse(data) }
        } catch (e) { return { success: false, error: String(e) } }
    }

    saveTournament(data: TournamentData): SaveLoadResult {
        try {
            localStorage.setItem(TOURNAMENT_STORAGE_KEY, JSON.stringify(data))

            // Archivage si fini
            if (data.status === 'completed') {
                this.archiveTournament(data)
            }

            return { success: true, path: 'localStorage/tournament' }
        } catch (e) { return { success: false, error: String(e) } }
    }

    private archiveTournament(tournament: TournamentData): void {
        try {
            const data = localStorage.getItem(TOURNAMENT_HISTORY_KEY)
            let history: TournamentData[] = data ? JSON.parse(data) : []

            if (!history.find(t => t.id === tournament.id)) {
                history.push(tournament)
                localStorage.setItem(TOURNAMENT_HISTORY_KEY, JSON.stringify(history))
            }
        } catch (e) { console.error('Erreur archivage tournoi web:', e) }
    }

    resetTournament(): SaveLoadResult {
        try {
            localStorage.removeItem(TOURNAMENT_STORAGE_KEY)
            return { success: true }
        } catch (e) { return { success: false, error: String(e) } }
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
