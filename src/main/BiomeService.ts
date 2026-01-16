import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

export interface BiomeObject {
    id: string
    type: string
    x: number
    y: number
    level: number
}

class BiomeServiceClass {
    private getSavePath(): string {
        return join(app.getPath('userData'), 'biome-save.json')
    }

    saveBiome(data: BiomeObject[]): { success: boolean, path?: string, error?: string } {
        try {
            const savePath = this.getSavePath()
            writeFileSync(savePath, JSON.stringify(data, null, 2), 'utf-8')
            return { success: true, path: savePath }
        } catch (error) {
            console.error('Erreur sauvegarde biome:', error)
            return { success: false, error: String(error) }
        }
    }

    loadBiome(): { success: boolean, data?: BiomeObject[], error?: string } {
        try {
            const savePath = this.getSavePath()
            if (!existsSync(savePath)) {
                return { success: false, error: 'Aucun biome trouvé' }
            }
            const data = JSON.parse(readFileSync(savePath, 'utf-8'))
            return { success: true, data }
        } catch (error) {
            console.error('Erreur chargement biome:', error)
            return { success: false, error: String(error) }
        }
    }
}

export const BiomeService = new BiomeServiceClass()
