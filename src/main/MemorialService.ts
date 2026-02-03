import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { FallenMob, MobData, MemorialResult } from '../shared/types'

class MemorialServiceClass {
  private fallen: FallenMob[] = []

  private getSavePath(): string {
    return join(app.getPath('userData'), 'memorial.json')
  }

  constructor() {
    this.load()
  }

  private load(): void {
    try {
      const path = this.getSavePath()
      if (existsSync(path)) {
        const data = readFileSync(path, 'utf-8')
        this.fallen = JSON.parse(data)
      }
    } catch (error) {
      console.error('[MemorialService] Error loading memorial:', error)
      this.fallen = []
    }
  }

  private save(): void {
    try {
      const path = this.getSavePath()
      writeFileSync(path, JSON.stringify(this.fallen, null, 2), 'utf-8')
    } catch (error) {
      console.error('[MemorialService] Error saving memorial:', error)
    }
  }

  getMemorial(): MemorialResult {
    return { success: true, fallen: [...this.fallen] }
  }

  addToMemorial(mob: MobData, killedBy: string): void {
    const fallenMob: FallenMob = {
      ...mob,
      dateOfDeath: new Date().toISOString(),
      killedBy
    }
    this.fallen.push(fallenMob)
    console.log(`[MemorialService] ${mob.nom} added to memorial. Killed by: ${killedBy}`)
    this.save()
  }

  getFallenCount(): number {
    return this.fallen.length
  }
}

export const MemorialService = new MemorialServiceClass()
