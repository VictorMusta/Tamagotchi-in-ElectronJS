import { MobActionResult, MobData, MobListResult, UpgradeChoicesResult, UpgradeChoice, ApplyUpgradeResult, MobStats } from '../../shared/types'

// Replicating basic shared types and logic for Web Version
// Ideally this should be shared code but for now we duplicate small parts to avoid complex build changes.

const POSSIBLE_TRAITS = [
    'Sprint Final',
    'Peau de Cuir',
    'Contre-attaque',
    'Appel de l\'Astico-Roi',
    'Main de Dentelle',
    'Berzerk'
]

export class WebApi {
    private getStorage(): MobData[] {
        const data = localStorage.getItem('mobs')
        return data ? JSON.parse(data) : []
    }

    private setStorage(mobs: MobData[]) {
        localStorage.setItem('mobs', JSON.stringify(mobs))
    }

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9)
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

    async createMob(nom: string, imageUrl: string): Promise<MobData> {
        const mobs = this.getStorage()

        // Default stats logic from MobService
        const pointsToDistribute = 40
        const r1 = Math.random()
        const r2 = Math.random()
        const r3 = Math.random()
        const r4 = Math.random()
        const sum = r1 + r2 + r3 + r4

        const stats: MobStats = {
            force: 5 + Math.floor((r1 / sum) * pointsToDistribute),
            vitalite: 5 + Math.floor((r2 / sum) * pointsToDistribute),
            vitesse: 5 + Math.floor((r3 / sum) * pointsToDistribute),
            agilite: 5 + Math.floor((r4 / sum) * pointsToDistribute)
        }

        // Remainder adjustment
        const currentSum = stats.force + stats.vitalite + stats.vitesse + stats.agilite
        const diff = 60 - currentSum
        if (diff > 0) stats.force += diff

        const newMob: MobData = {
            id: this.generateId(),
            nom: nom, // Uniqueness validation skipped for prototype speed, but could be added
            imageUrl: imageUrl,
            vie: 100 + (stats.vitalite * 5),
            energie: 100,
            status: 'vivant',
            level: 1,
            experience: 0,
            statPoints: 0,
            stats: stats,
            traits: this.generateRandomTraits(),
            skin: { hat: 'none', bottom: 'none' },
            combatProgress: { wins: 0, losses: 0, winStreak: 0, tournamentWins: 0 },
            inSquad: mobs.filter(m => m.inSquad).length < 10
        }

        mobs.push(newMob)
        this.setStorage(mobs)
        return newMob
    }

    async deleteMob(id: string): Promise<boolean> {
        const mobs = this.getStorage()
        const newMobs = mobs.filter(m => m.id !== id)
        if (newMobs.length === mobs.length) return false
        this.setStorage(newMobs)
        return true
    }

    async renameMob(id: string, newName: string): Promise<MobActionResult> {
        const mobs = this.getStorage()
        const mob = mobs.find(m => m.id === id)
        if (!mob) return { success: false, error: 'Not found' }
        mob.nom = newName
        this.setStorage(mobs)
        return { success: true, mob }
    }

    async updateMobSkin(id: string, type: 'hat' | 'bottom', value: string): Promise<MobActionResult> {
        const mobs = this.getStorage()
        const mob = mobs.find(m => m.id === id)
        if (!mob) return { success: false, error: 'Not found' }
        if (!mob.skin) mob.skin = { hat: 'none', bottom: 'none' }
        mob.skin[type] = value
        this.setStorage(mobs)
        return { success: true, mob }
    }

    async toggleSquad(id: string): Promise<MobActionResult> {
        const mobs = this.getStorage()
        const mob = mobs.find(m => m.id === id)
        if (!mob) return { success: false, error: 'Not found' }

        if (mob.inSquad) {
            mob.inSquad = false
        } else {
            if (mobs.filter(m => m.inSquad).length >= 10) {
                return { success: false, error: 'Full squad' }
            }
            mob.inSquad = true
        }
        this.setStorage(mobs)
        return { success: true, mob }
    }

    async getAllMobs(): Promise<MobData[]> {
        return this.getStorage()
    }

    async getMobById(id: string): Promise<MobData | null> {
        const mobs = this.getStorage()
        return mobs.find(m => m.id === id) || null
    }

    async saveMobs(): Promise<any> {
        // Already saved in localStorage on every action in this implementation
        return { success: true, path: 'localStorage' }
    }

    async loadMobs(): Promise<MobListResult> {
        return { success: true, mobs: this.getStorage() }
    }

    // Stubs for other methods to allow app to run
    async processCombatResult(winner: any, loser: any): Promise<any> {
        const mobs = this.getStorage()
        const winnerMob = mobs.find(m => m.id === winner.id)
        const loserMob = mobs.find(m => m.id === loser.id)

        if (loserMob) {
            loserMob.vie = 100 + (loserMob.stats.vitalite * 5)
            loserMob.energie = 100
            loserMob.status = 'vivant'
        }

        let reward: string | undefined
        if (winnerMob) {
            winnerMob.vie = 100 + (winnerMob.stats.vitalite * 5)
            winnerMob.energie = 100
            winnerMob.status = 'vivant'
            winnerMob.combatProgress.wins++
            winnerMob.combatProgress.winStreak++
            winnerMob.experience += 50

            // Level Up Check
            const xpNeeded = Math.floor(100 * Math.pow(1.5, winnerMob.level - 1))
            if (winnerMob.experience >= xpNeeded) {
                winnerMob.experience -= xpNeeded
                winnerMob.level++
                winnerMob.statPoints++
            }

            if (winnerMob.combatProgress.winStreak >= 5) {
                reward = 'Fiole de Réanimation'
                winnerMob.combatProgress.winStreak = 0
            }
        }

        this.setStorage(mobs)
        return {
            winner: winnerMob || winner,
            loser: loserMob || loser,
            reward
        }
    }

    async getMobUpgradeChoices(id: string): Promise<UpgradeChoicesResult> {
        const mobs = this.getStorage()
        const mob = mobs.find(m => m.id === id)
        if (!mob) return { success: false, error: 'Mob not found' }
        if (mob.statPoints <= 0) return { success: false, error: 'No stat points' }

        // Generate choices (simulated)
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

        const weapons = ['Épée Web', 'Bâton HTML', 'Hache CSS', 'Marteau JS']
        const randomWeapon = weapons[Math.floor(Math.random() * weapons.length)]
        choices.push({ type: 'weapon', name: randomWeapon, label: randomWeapon })

        const availableTraits = POSSIBLE_TRAITS.filter(t => !mob.traits.includes(t))
        if (availableTraits.length > 0) {
            const randomTrait = availableTraits[Math.floor(Math.random() * availableTraits.length)]
            choices.push({ type: 'trait', name: randomTrait, label: randomTrait, description: `Trait: ${randomTrait}` })
        }

        return { success: true, choices }
    }

    async applyMobUpgrade(id: string, choice: UpgradeChoice): Promise<ApplyUpgradeResult> {
        const mobs = this.getStorage()
        const mob = mobs.find(m => m.id === id)
        if (!mob) return { success: false, error: 'Mob not found' }
        if (mob.statPoints <= 0) return { success: false, error: 'No stat points' }

        if (choice.type === 'stat') {
            mob.stats[choice.stat!] += choice.amount!
            if (choice.stat === 'vitalite') mob.vie += (choice.amount! * 5)
            mob.statPoints--
        } else if (choice.type === 'trait') {
            if (!mob.traits.includes(choice.name!)) {
                mob.traits.push(choice.name!)
                mob.statPoints--
            }
        } else if (choice.type === 'weapon') {
            console.log('Weapon obtained:', choice.name)
        }

        this.setStorage(mobs)
        return { success: true, mob }
    }

    async processTournamentWin(id: string) {
        const mobs = this.getStorage()
        const mob = mobs.find(m => m.id === id)
        if (!mob) return { success: false, error: 'Mob not found' }

        mob.combatProgress.tournamentWins++
        mob.experience += 500

        // Level up logic (simplified duplication)
        const xpNeeded = Math.floor(100 * Math.pow(1.5, mob.level - 1))
        if (mob.experience >= xpNeeded) {
            mob.experience -= xpNeeded
            mob.level++
            mob.statPoints++
        }

        this.setStorage(mobs)
        return { success: true, mob }
    }

    async getTournament() {
        const data = localStorage.getItem('tournament')
        return { success: true, tournament: data ? JSON.parse(data) : undefined }
    }

    async getTournamentHistory() {
        const data = localStorage.getItem('tournament_history')
        return { success: true, tournaments: data ? JSON.parse(data) : [] }
    }

    async saveTournament(data: any) {
        localStorage.setItem('tournament', JSON.stringify(data))
        if (data.status === 'completed') {
            const history = JSON.parse(localStorage.getItem('tournament_history') || '[]')
            history.push(data)
            localStorage.setItem('tournament_history', JSON.stringify(history))
        }
        return { success: true }
    }

    async resetTournament() { localStorage.removeItem('tournament'); return { success: true } }
    async setIgnoreMouseEvents() { /* No-op */ }
    async saveBiome(data: any) { localStorage.setItem('biome', JSON.stringify(data)); return { success: true } }
    async loadBiome() {
        const data = localStorage.getItem('biome')
        return { success: true, data: data ? JSON.parse(data) : null }
    }
    async minimizeWindow() { console.log('minimize') }
    async closeWindow() { console.log('close') }
}
