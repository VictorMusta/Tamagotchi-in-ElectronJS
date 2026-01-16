import { MobData, MobStatus, MobStats, MobSkin, CombatStats } from '../../shared/types'
import { MobDisplay } from './mob/MobDisplay'
import { MobAnimation } from './mob/MobAnimation'
import { MobMovement } from './mob/MobMovement'
import { MobRenamer } from './mob/MobRenamer'

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

  private display: MobDisplay
  private animation: MobAnimation | null = null
  private movement: MobMovement | null = null
  private renamer: MobRenamer | null = null
  private isRenaming: boolean = false

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

    this.display = new MobDisplay(data)
  }

  updateFromData(data: MobData): void {
    const wasAlive = this.status === 'vivant'

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

    this.display.update(data)

    if (this.movement) {
      this.movement.updateStatus(this.status)
    }

    if (wasAlive && this.status === 'mort') {
      this.stopBehavior()
    }
    if (!wasAlive && this.status === 'vivant') {
      this.startBehavior()
    }
  }

  playSoundEffect(sound: 'punch' | 'death' | 'heal' | 'revive'): void {
    this.animation?.playSoundEffect(sound)
  }

  setSelected(selected: boolean): void {
    this.display.setSelected(selected)
  }

  startBehavior(): void {
    this.movement?.start()
  }

  stopBehavior(): void {
    this.movement?.stop()
  }

  private jump(distance: number, targetX: number): void {
    if (!this.animation || !this.movement) return

    const jumpHeight = 100 + Math.random() * 200
    const jumpDistance = (20 + Math.random() * 25) * Math.sign(distance)
    const jumpDuration = 0.5 + Math.random() * 0.3

    this.animation.setFacingLeft(distance < 0)
    this.animation.applyJumpAnimation(jumpHeight, jumpDuration)

    setTimeout(() => {
      if (!this.movement) return
      const actualDistance = Math.min(Math.abs(distance), Math.abs(jumpDistance)) * Math.sign(distance)
      this.movement.updatePosition(this.movement.getPosX() + actualDistance)
    }, (jumpDuration * 1000) / 3)

    setTimeout(() => {
      this.animation?.removeJumpAnimation()

      const remainingDistance = targetX - (this.movement?.getPosX() || 0)
      if (this.movement?.isCurrentlyMoving() && Math.abs(remainingDistance) >= 5) {
        setTimeout(() => {
          if (this.movement?.isCurrentlyMoving()) {
            this.jump(remainingDistance, targetX)
          }
        }, 3000 + Math.random() * 7000)
      } else {
        this.movement?.setIsMoving(false)
      }
    }, jumpDuration * 1000)
  }

  render(container: HTMLElement): HTMLElement {
    const el = this.display.render(
      container,
      () => {
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
    this.movement = new MobMovement(
      el,
      this.status,
      () => this.isRenaming,
      (dist, target) => this.jump(dist, target)
    )
    this.renamer = new MobRenamer(
      this.id,
      () => this.nom,
      (name) => { this.nom = name },
      () => {
        this.isRenaming = true
        this.stopBehavior()
      },
      () => {
        this.isRenaming = false
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
    this.display.destroy()
  }
}


