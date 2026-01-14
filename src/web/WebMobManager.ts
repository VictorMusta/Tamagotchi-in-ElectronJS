import { MobData, MobActionResult, MobListResult, SaveLoadResult, MobStatus } from '../shared/types'

const STORAGE_KEY = 'tamagotchi_mobs_save'

/**
 * Classe Mob - Logique métier portée pour le web
 * (Version sans dépendances Node.js)
 */
export class Mob {
    id: string
    nom: string
    imageUrl: string
    vie: number
    energie: number
    faim: number
    status: MobStatus

    constructor(
        nom: string,
        imageUrl: string,
        vie: number = 100,
        energie: number = 100,
        faim: number = 0,
        id?: string
    ) {
        this.id = id || crypto.randomUUID()
        this.nom = nom
        this.imageUrl = imageUrl
        this.vie = vie
        this.energie = energie
        this.faim = faim
        this.status = vie > 0 ? 'vivant' : 'mort'
    }

    private updateStatus(): void {
        this.status = this.vie > 0 ? 'vivant' : 'mort'
    }

    takeDamage(amount: number): boolean {
        const wasAlive = this.status === 'vivant'
        this.vie = Math.max(0, this.vie - amount)
        this.updateStatus()
        return wasAlive && this.status === 'mort'
    }

    heal(amount: number): boolean {
        if (this.status === 'mort') return false
        this.vie = Math.min(100, this.vie + amount)
        this.updateStatus()
        return true
    }

    feed(amount: number): boolean {
        if (this.status === 'mort') return false
        this.faim = Math.max(0, this.faim - amount)
        return true
    }

    revive(): boolean {
        if (this.status === 'vivant') return false
        this.vie = 50
        this.energie = 50
        this.faim = 50
        this.updateStatus()
        return true
    }

    rename(newName: string): void {
        this.nom = newName
    }

    toJSON(): MobData {
        return {
            id: this.id,
            nom: this.nom,
            imageUrl: this.imageUrl,
            vie: this.vie,
            energie: this.energie,
            faim: this.faim,
            status: this.status
        }
    }

    static fromJSON(data: MobData): Mob {
        const mob = new Mob(data.nom, data.imageUrl, data.vie, data.energie, data.faim, data.id)
        mob.status = data.status
        return mob
    }
}

/**
 * Gestionnaire de mobs pour le web (utilise localStorage)
 */
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
        if (!mob) return false
        if (mob.status !== 'mort') return false
        return this.mobs.delete(id)
    }

    getMobById(id: string): MobData | null {
        const mob = this.mobs.get(id)
        return mob ? mob.toJSON() : null
    }

    getAllMobs(): MobData[] {
        return Array.from(this.mobs.values()).map((mob) => mob.toJSON())
    }

    damageMob(id: string, amount: number): MobActionResult {
        const mob = this.mobs.get(id)
        if (!mob) {
            return { success: false, error: 'Mob non trouvé' }
        }
        const justDied = mob.takeDamage(amount)
        return { success: true, mob: mob.toJSON(), error: justDied ? 'died' : undefined }
    }

    healMob(id: string, amount: number): MobActionResult {
        const mob = this.mobs.get(id)
        if (!mob) {
            return { success: false, error: 'Mob non trouvé' }
        }
        const healed = mob.heal(amount)
        if (!healed) {
            return { success: false, error: 'Le mob est mort', mob: mob.toJSON() }
        }
        return { success: true, mob: mob.toJSON() }
    }

    feedMob(id: string, amount: number): MobActionResult {
        const mob = this.mobs.get(id)
        if (!mob) {
            return { success: false, error: 'Mob non trouvé' }
        }
        const fed = mob.feed(amount)
        if (!fed) {
            return { success: false, error: 'Le mob est mort', mob: mob.toJSON() }
        }
        return { success: true, mob: mob.toJSON() }
    }

    reviveMob(id: string): MobActionResult {
        const mob = this.mobs.get(id)
        if (!mob) {
            return { success: false, error: 'Mob non trouvé' }
        }
        const revived = mob.revive()
        if (!revived) {
            return { success: false, error: 'Le mob est déjà vivant', mob: mob.toJSON() }
        }
        return { success: true, mob: mob.toJSON() }
    }

    renameMob(id: string, newName: string): MobActionResult {
        const mob = this.mobs.get(id)
        if (!mob) {
            return { success: false, error: 'Mob non trouvé' }
        }
        const uniqueName = this.getUniqueName(newName, id)
        mob.rename(uniqueName)
        return { success: true, mob: mob.toJSON() }
    }

    private getUniqueName(baseName: string, excludeId?: string): string {
        let name = baseName
        let counter = 2

        while (Array.from(this.mobs.values()).some((m) => m.id !== excludeId && m.nom === name)) {
            name = `${baseName} ${counter}`
            counter++
        }

        return name
    }

    saveMobs(): SaveLoadResult {
        try {
            const mobsData = this.getAllMobs()
            const jsonString = JSON.stringify(mobsData, null, 2)
            localStorage.setItem(STORAGE_KEY, jsonString)
            console.log('Mobs sauvegardés dans localStorage')
            return { success: true, path: 'localStorage' }
        } catch (error) {
            console.error('Erreur de sauvegarde:', error)
            return { success: false, error: String(error) }
        }
    }

    loadMobs(): MobListResult {
        try {
            const data = localStorage.getItem(STORAGE_KEY)
            if (!data) {
                return { success: false, error: 'Aucune sauvegarde trouvée' }
            }
            const mobsData: MobData[] = JSON.parse(data)

            this.mobs.clear()
            mobsData.forEach((mobData) => {
                const mob = Mob.fromJSON(mobData)
                this.mobs.set(mob.id, mob)
            })

            console.log('Mobs chargés:', this.mobs.size)
            return { success: true, mobs: this.getAllMobs() }
        } catch (error) {
            console.error('Erreur de chargement:', error)
            return { success: false, error: String(error) }
        }
    }

    clear(): void {
        this.mobs.clear()
    }

    count(): number {
        return this.mobs.size
    }
}

export const WebMobManager = new WebMobManagerClass()
