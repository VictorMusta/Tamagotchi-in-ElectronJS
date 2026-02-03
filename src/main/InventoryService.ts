import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { PlayerInventory, InventoryResult } from '../shared/types'

class InventoryServiceClass {
  private inventory: PlayerInventory = { potions: 0 }

  private getSavePath(): string {
    return join(app.getPath('userData'), 'inventory.json')
  }

  constructor() {
    this.load()
  }

  private load(): void {
    try {
      const path = this.getSavePath()
      if (existsSync(path)) {
        const data = readFileSync(path, 'utf-8')
        this.inventory = JSON.parse(data)
      }
    } catch (error) {
      console.error('[InventoryService] Error loading inventory:', error)
      this.inventory = { potions: 0 }
    }
  }

  private save(): void {
    try {
      const path = this.getSavePath()
      writeFileSync(path, JSON.stringify(this.inventory, null, 2), 'utf-8')
    } catch (error) {
      console.error('[InventoryService] Error saving inventory:', error)
    }
  }

  getInventory(): InventoryResult {
    return { success: true, inventory: { ...this.inventory } }
  }

  addPotion(): void {
    this.inventory.potions++
    console.log(`[InventoryService] Potion added! Total: ${this.inventory.potions}`)
    this.save()
  }

  usePotion(): boolean {
    if (this.inventory.potions <= 0) {
      return false
    }
    this.inventory.potions--
    console.log(`[InventoryService] Potion used! Remaining: ${this.inventory.potions}`)
    this.save()
    return true
  }

  getPotionCount(): number {
    return this.inventory.potions
  }
}

export const InventoryService = new InventoryServiceClass()
