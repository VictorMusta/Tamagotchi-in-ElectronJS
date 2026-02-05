import { MobData, MobStatus, MobStats, MobSkin, CombatStats } from '../../shared/types'
import { MobDisplay } from './mob/MobDisplay'
import { MobAnimation } from './mob/MobAnimation'
import { MobMovement } from './mob/MobMovement'
import { MobRenamer } from './mob/MobRenamer'
import { PhysicsWorld } from './physics/PhysicsWorld'

// Gestionnaire global pour le mob sélectionné
let selectedMobRenderer: MobRenderer | null = null

// Callback pour le renommage via IPC
let onRenameCallback: ((mobRenderer: MobRenderer, newName: string) => Promise<string>) | null = null

// Callback pour les clics sur les mobs
let onMobClickCallback: ((mobRenderer: MobRenderer) => void) | null = null

// Callback pour vérifier si une action est sélectionnée
let isActionModeActiveCallback: (() => boolean) | null = null

// Callback pour ouvrir le profil d'un mob
let onProfileOpenCallback: ((mobRenderer: MobRenderer) => void) | null = null

export function getSelectedMob(): MobRenderer | null {
  return selectedMobRenderer
}

export function setSelectedMob(mobRenderer: MobRenderer | null): void {
  if (selectedMobRenderer) {
    selectedMobRenderer.setSelected(false)
  }
  selectedMobRenderer = mobRenderer
  if (selectedMobRenderer) {
    selectedMobRenderer.setSelected(true)
  }
}

export function setOnRenameCallback(
  callback: (mobRenderer: MobRenderer, newName: string) => Promise<string>
): void {
  onRenameCallback = callback
}

export function setOnMobClick(callback: (mobRenderer: MobRenderer) => void): void {
  onMobClickCallback = callback
}

export function setIsActionModeActive(callback: () => boolean): void {
  isActionModeActiveCallback = callback
}

export function setOnProfileOpen(callback: (mobRenderer: MobRenderer) => void): void {
  onProfileOpenCallback = callback
}

/**
 * Classe MobRenderer - Orchestrateur du rendu et des comportements du mob
 */
export class MobRenderer {
  id: string
  nom: string
  imageUrl: string
  vie: number
  energie: number
  status: MobStatus
  // Nouvelles propriétés pour le combat et la customisation
  stats: MobStats
  level: number
  experience: number
  statPoints: number
  traits: string[]
  skin: MobSkin
  combatProgress: CombatStats
  weapons: string[]
  inSquad: boolean
  hpMultiplier?: number
  isInOnsen: boolean
  lastOnsenEntryTimestamp: number | null
  hpAtOnsenEntry: number | null
  onsenPosition?: { x: number, y: number } | null

  private display: MobDisplay
  private animation: MobAnimation | null = null
  public movement: MobMovement | null = null
  private renamer: MobRenamer | null = null
  private behaviorTimeout: any = null

  constructor(data: MobData) {
    this.id = data.id
    this.nom = data.nom
    this.imageUrl = data.imageUrl
    this.vie = data.vie
    this.energie = data.energie

    this.status = data.status
    this.stats = data.stats
    this.level = data.level
    this.experience = data.experience
    this.statPoints = data.statPoints
    this.skin = data.skin
    this.traits = data.traits
    this.combatProgress = data.combatProgress
    this.weapons = data.weapons || []
    this.inSquad = data.inSquad || false
    this.hpMultiplier = data.hpMultiplier
    this.isInOnsen = data.isInOnsen || false
    this.lastOnsenEntryTimestamp = data.lastOnsenEntryTimestamp || null
    this.hpAtOnsenEntry = data.hpAtOnsenEntry || null
    this.onsenPosition = data.onsenPosition || null

    this.display = new MobDisplay(data)
  }

  updateFromData(data: MobData): void {
    // console.log(`[MobRenderer] updateFromData called for ${this.nom}`)
    const wasAlive = this.status === 'vivant'

    this.id = data.id // Ensure ID is synced just in case
    this.nom = data.nom
    this.vie = data.vie
    this.energie = data.energie

    this.status = data.status
    this.stats = data.stats
    this.level = data.level
    this.experience = data.experience
    this.statPoints = data.statPoints
    this.skin = data.skin
    this.traits = data.traits
    this.combatProgress = data.combatProgress
    this.weapons = data.weapons || []
    this.inSquad = data.inSquad || false
    this.hpMultiplier = data.hpMultiplier
    this.isInOnsen = data.isInOnsen || false
    this.lastOnsenEntryTimestamp = data.lastOnsenEntryTimestamp || null
    this.onsenPosition = data.onsenPosition || null

    // 1. Update Movement & Sync Physics State FIRST
    if (this.movement) {
      this.movement.updateStatus(this.status)
      
      // SYNC ONSEN STATE FROM PHYSICS (Source of Truth)
      // The renderer/data check is visual and can be inaccurate
      if (this.movement.inOnsen) {
          this.isInOnsen = true
          data.isInOnsen = true // Patch data so display.update uses correct state for health bar!
      }
    }

    // 2. Update Display (Health bar, etc)
    this.display.update(data)
    
    // 3. Update Visual Effects (Particles)
    this.display.setHealingState(this.isInOnsen)

    if (wasAlive && this.status === 'mort') {
      this.stopBehavior()
    }
    if (!wasAlive && this.status === 'vivant') {
      this.startBehavior()
    }
  }

  playSoundEffect(sound: 'punch' | 'death' | 'revive'): void {
    this.animation?.playSoundEffect(sound)
  }

  setSelected(selected: boolean): void {
    this.display.setSelected(selected)
  }

  startBehavior(): void {
    // Random hopping behavior
    if (this.status === 'vivant' && !this.isInOnsen) {
      // Clear existing interval just in case
      this.stopBehavior()
      // Simple random interval for hopping
      // Storing interval on the instance would be better but this is quick cleanup
      // Actually let's use a property on the class if possible, or just rely on MobMovement's internal updates if we moved logic there.
      // For now, let's just make them hop occasionally via timeout loop locally.
      const planBehavior = () => {
        if (this.status !== 'vivant' || this.isInOnsen) {
          this.behaviorTimeout = null
          return
        }

        const r = Math.random()

        if (r < 0.4) {
          // Idle (Breathing handles visuals)
        } else if (r < 0.7) {
          // Walk / Wander
          const dir = Math.random() > 0.5 ? 1 : -1
          this.movement?.walk(dir)
        } else {
           // Random Jump (Small hop to Big leap)
           this.movement?.hop(Math.random()) 
        }

        // Loop - dynamic timing
        this.behaviorTimeout = setTimeout(planBehavior, 1000 + Math.random() * 3000)
      }
      planBehavior()
    }
  }

  stopBehavior(): void {
    if (this.behaviorTimeout) {
      clearTimeout(this.behaviorTimeout)
      this.behaviorTimeout = null
    }
    this.movement?.stop()
  }

  // Legacy jump removed. Physics handles position.

  getPosX(): number {
    return this.movement?.getPosX() || 0
  }

    render(
    container: HTMLElement,
    physicsWorld: PhysicsWorld
  ): HTMLElement {
    const el = this.display.render(
      container,
      () => {
        // --- Quick Win: Squish on Click ---
        this.movement?.squish()
        
        // Don't select mobs in Onsen to prevent high five jumps
        // Guard removed to allow combat selection
        
        if (onMobClickCallback) {
          onMobClickCallback(this)
        } else {
          setSelectedMob(this)
        }
      },
      (nameEl) => {
        const isActionActive = isActionModeActiveCallback ? isActionModeActiveCallback() : false
        if (!isActionActive) {
          if (onProfileOpenCallback) {
            onProfileOpenCallback(this)
          } else {
            this.renamer?.start(nameEl)
          }
        }
      }
    )

    this.animation = new MobAnimation(el)

    // Initial Position (Random if not set)
    const initialX = (this.isInOnsen && this.onsenPosition) ? this.onsenPosition.x : Math.random() * (window.innerWidth - 100) + 50
    const initialY = (this.isInOnsen && this.onsenPosition) ? this.onsenPosition.y : null

    this.movement = new MobMovement(
      el,
      physicsWorld,
      initialX,
      initialY,
      this.display.mobInner // Pass rotation element to decouple rotation from particles
    )

    this.renamer = new MobRenamer(
      this.id,
      () => this.nom,
      (name) => { this.nom = name },
      () => {
        this.stopBehavior()
      },
      () => {
        if (this.status === 'vivant') {
          this.startBehavior()
        }
      },
      async (_id, newName) => {
        if (onRenameCallback) {
          return await onRenameCallback(this, newName)
        }
        return newName
      }
    )

    if (this.status === 'vivant') {
      this.startBehavior()
    }

    return el
  }

  destroy(): void {
    this.stopBehavior()
    this.movement?.destroy() // Ensure physics body is removed
    this.display.destroy()
  }
}
