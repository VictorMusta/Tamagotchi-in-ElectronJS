import { playSound } from './SoundManager'

export type MobStatus = 'vivant' | 'mort'

// Interface pour les données des mobs (provenant du backend)
export interface MobData {
  id: string
  nom: string
  imageUrl: string
  vie: number
  energie: number
  faim: number
  status: MobStatus
}

// Gestionnaire global pour le mob sélectionné
let selectedMobRenderer: MobRenderer | null = null

// Callback pour le renommage via IPC
let onRenameCallback: ((mobRenderer: MobRenderer, newName: string) => Promise<string>) | null = null

// Callback pour les clics sur les mobs
let onMobClickCallback: ((mobRenderer: MobRenderer) => void) | null = null

// Callback pour vérifier si une action est sélectionnée
let isActionModeActiveCallback: (() => boolean) | null = null

export function getSelectedMob(): MobRenderer | null {
  return selectedMobRenderer
}

export function setSelectedMob(mobRenderer: MobRenderer | null): void {
  // Retirer la classe selected de l'ancien mob
  if (selectedMobRenderer) {
    selectedMobRenderer.setSelected(false)
  }
  selectedMobRenderer = mobRenderer
  // Ajouter la classe selected au nouveau mob
  if (selectedMobRenderer) {
    selectedMobRenderer.setSelected(true)
  }
}

/**
 * Définit le callback appelé lors du renommage d'un mob
 * Le callback reçoit le mob et le nouveau nom souhaité, et retourne le nom final (via IPC)
 */
export function setOnRenameCallback(
  callback: (mobRenderer: MobRenderer, newName: string) => Promise<string>
): void {
  onRenameCallback = callback
}

/**
 * Définit le callback appelé lors d'un clic sur un mob
 */
export function setOnMobClick(callback: (mobRenderer: MobRenderer) => void): void {
  onMobClickCallback = callback
}

/**
 * Définit le callback pour vérifier si un mode d'action est actif
 */
export function setIsActionModeActive(callback: () => boolean): void {
  isActionModeActiveCallback = callback
}

/**
 * Classe MobRenderer - Gère uniquement le rendu visuel et les animations
 * La logique métier est dans le backend (MobService)
 */
export class MobRenderer {
  // Données provenant du backend
  id: string
  nom: string
  imageUrl: string
  vie: number
  energie: number
  faim: number
  status: MobStatus

  private element: HTMLElement | null = null

  // Propriétés de mouvement (gérées côté frontend uniquement)
  private posX: number = 0
  private targetX: number = 0
  private isMoving: boolean = false
  private facingLeft: boolean = false
  private moveInterval: ReturnType<typeof setInterval> | null = null
  private thinkInterval: ReturnType<typeof setInterval> | null = null
  private isRenaming: boolean = false

  constructor(data: MobData) {
    this.id = data.id
    this.nom = data.nom
    this.imageUrl = data.imageUrl
    this.vie = data.vie
    this.energie = data.energie
    this.faim = data.faim
    this.status = data.status

    // Position initiale aléatoire
    this.posX = Math.random() * (window.innerWidth - 100)
    this.targetX = this.posX
  }

  /**
   * Met à jour les données du mob depuis le backend
   */
  updateFromData(data: MobData): void {
    const wasAlive = this.status === 'vivant'

    this.nom = data.nom
    this.vie = data.vie
    this.energie = data.energie
    this.faim = data.faim
    this.status = data.status

    this.updateDisplay()

    // Si le mob vient de mourir, arrêter le comportement
    if (wasAlive && this.status === 'mort') {
      this.stopBehavior()
    }
    // Si le mob vient de revivre, redémarrer le comportement
    if (!wasAlive && this.status === 'vivant') {
      this.startBehavior()
    }
  }

  /**
   * Joue un son et affiche un effet visuel (appelé après confirmation du backend)
   */
  playSoundEffect(sound: 'punch' | 'death' | 'heal' | 'feed' | 'revive'): void {
    playSound(sound)
    // Ajouter un effet visuel pour indiquer l'action (utile quand l'audio ne fonctionne pas)
    this.showSoundVisualFeedback(sound)
  }

  /**
   * Affiche un feedback visuel pour les sons (flash coloré sur le mob)
   */
  private showSoundVisualFeedback(sound: string): void {
    if (!this.element) return

    // Couleurs selon le type de son
    const colors: Record<string, string> = {
      punch: '#ff4444',
      death: '#000000',
      heal: '#44ff44',
      feed: '#ffaa44',
      revive: '#44ffff'
    }

    const color = colors[sound] || '#ffffff'
    const img = this.element.querySelector('.mob-image') as HTMLElement
    if (img) {
      const originalFilter = img.style.filter
      img.style.filter = `drop-shadow(0 0 20px ${color}) brightness(1.3)`
      setTimeout(() => {
        img.style.filter = originalFilter
      }, 200)
    }
  }

  /**
   * Définit si le mob est sélectionné
   */
  setSelected(selected: boolean): void {
    if (!this.element) return
    if (selected) {
      this.element.classList.add('selected')
    } else {
      this.element.classList.remove('selected')
    }
  }

  /**
   * Démarre le comportement autonome du mob
   */
  startBehavior(): void {
    if (this.status === 'mort' || this.isRenaming) return

    // Réfléchir à une nouvelle destination toutes les 2-5 secondes
    this.thinkInterval = setInterval(
      () => {
        if (this.status === 'mort' || this.isRenaming) {
          this.stopBehavior()
          return
        }

        // 70% de chance de décider de bouger
        if (Math.random() < 0.7) {
          this.chooseNewTarget()
        }
      },
      2000 + Math.random() * 3000
    )

    // Démarrer le mouvement
    this.moveInterval = setInterval(() => {
      this.moveTowardsTarget()
    }, 50)
  }

  /**
   * Arrête le comportement autonome
   */
  stopBehavior(): void {
    if (this.thinkInterval) {
      clearInterval(this.thinkInterval)
      this.thinkInterval = null
    }
    if (this.moveInterval) {
      clearInterval(this.moveInterval)
      this.moveInterval = null
    }
  }

  /**
   * Choisit une nouvelle destination aléatoire
   */
  private chooseNewTarget(): void {
    const maxX = window.innerWidth - 100
    const minX = 50

    // Nouvelle destination entre 100 et 400 pixels de distance
    const distance = 100 + Math.random() * 300
    const direction = Math.random() < 0.5 ? -1 : 1

    this.targetX = this.posX + distance * direction
    this.targetX = Math.max(minX, Math.min(maxX, this.targetX))
  }

  /**
   * Déplace le mob vers sa cible en sautant
   */
  private moveTowardsTarget(): void {
    if (!this.element || this.status === 'mort' || this.isRenaming) return

    const distance = this.targetX - this.posX

    // Si on est assez proche, arrêter
    if (Math.abs(distance) < 5) {
      this.isMoving = false
      return
    }

    // Déterminer la direction
    this.facingLeft = distance < 0
    this.element.classList.toggle('facing-left', this.facingLeft)

    // Si on ne bouge pas déjà, commencer à sauter
    if (!this.isMoving) {
      this.isMoving = true
      this.jump()
    }
  }

  /**
   * Fait sauter le mob
   */
  private jump(): void {
    if (!this.element || this.status === 'mort' || this.isRenaming) return

    const distance = this.targetX - this.posX
    if (Math.abs(distance) < 5) {
      this.isMoving = false
      return
    }

    // Paramètres aléatoires pour ce saut
    const jumpHeight = 100 + Math.random() * 200 // Entre 100 et 300 pixels
    const jumpDistance = (20 + Math.random() * 25) * Math.sign(distance) // Entre 20 et 45 pixels
    const jumpDuration = 0.5 + Math.random() * 0.3 // Entre 0.5 et 0.8 secondes

    // Appliquer les variables CSS pour l'animation
    this.element.style.setProperty('--jump-height', `-${jumpHeight}px`)
    this.element.style.setProperty('--jump-duration', `${jumpDuration}s`)

    // Ajouter la classe de saut
    this.element.classList.add('jumping')

    // Déplacer pendant le saut (au milieu de l'animation)
    setTimeout(() => {
      if (!this.element) return
      const actualDistance =
        Math.min(Math.abs(distance), Math.abs(jumpDistance)) * Math.sign(distance)
      this.posX += actualDistance
      this.element.style.left = `${this.posX}px`
    }, (jumpDuration * 1000) / 3)

    // Retirer la classe de saut après l'animation
    setTimeout(
      () => {
        if (this.element) {
          this.element.classList.remove('jumping')
        }

        // Continuer à sauter si pas arrivé (délai plus long entre les sauts)
        if (this.isMoving && Math.abs(this.targetX - this.posX) >= 5) {
          setTimeout(() => this.jump(), 3000 + Math.random() * 7000)
        } else {
          this.isMoving = false
        }
      },
      jumpDuration * 1000
    )
  }

  /**
   * Démarre le mode de renommage du mob
   */
  private startRenaming(nameElement: HTMLElement): void {
    // Arrêter le comportement pendant le renommage
    this.isRenaming = true
    this.stopBehavior()

    const currentName = this.nom
    const input = document.createElement('input')
    input.type = 'text'
    input.value = currentName
    input.className = 'mob-name-input'
    input.style.cssText = `
      font-size: inherit;
      font-family: inherit;
      width: 100%;
      padding: 2px 4px;
      border: 1px solid #4a9eff;
      border-radius: 3px;
      background: #2a2a2a;
      color: inherit;
      outline: none;
    `

    const finishRenaming = async (): Promise<void> => {
      let newName = input.value.trim()
      if (newName && newName !== currentName) {
        // Utiliser le callback pour renommer via IPC
        if (onRenameCallback) {
          newName = await onRenameCallback(this, newName)
        }
        this.nom = newName
      }
      nameElement.textContent = this.nom
      nameElement.style.display = ''
      input.remove()

      // Redémarrer le comportement après le renommage
      this.isRenaming = false
      if (this.status === 'vivant') {
        this.startBehavior()
      }
    }

    input.addEventListener('blur', finishRenaming)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        input.blur()
      } else if (e.key === 'Escape') {
        input.value = currentName // Annuler les changements
        input.blur()
      }
    })

    nameElement.style.display = 'none'
    nameElement.parentElement?.insertBefore(input, nameElement)
    input.focus()
    input.select()
  }

  /**
   * Met à jour l'affichage du mob
   */
  private updateDisplay(): void {
    if (!this.element) return

    const img = this.element.querySelector('.mob-image') as HTMLImageElement
    if (img) {
      img.style.filter = this.status === 'mort' ? 'grayscale(100%)' : 'none'
      img.style.opacity = this.status === 'mort' ? '0.5' : '1'
    }

    const vieBar = this.element.querySelector('.mob-stat-vie .mob-stat-fill') as HTMLElement
    const energieBar = this.element.querySelector('.mob-stat-energie .mob-stat-fill') as HTMLElement
    const faimBar = this.element.querySelector('.mob-stat-faim .mob-stat-fill') as HTMLElement

    if (vieBar) vieBar.style.width = `${this.vie}%`
    if (energieBar) energieBar.style.width = `${this.energie}%`
    if (faimBar) faimBar.style.width = `${this.faim}%`

    const statusEl = this.element.querySelector('.mob-status') as HTMLElement
    if (statusEl) {
      statusEl.textContent = this.status
      statusEl.className = `mob-status ${this.status}`
    }

    // Mettre à jour le nom
    const nameEl = this.element.querySelector('.mob-name') as HTMLElement
    if (nameEl) {
      nameEl.textContent = this.nom
    }
  }

  /**
   * Rend le mob visible dans le DOM
   */
  render(container: HTMLElement): HTMLElement {
    this.element = document.createElement('div')
    this.element.className = 'mob'
    this.element.style.left = `${this.posX}px`
    this.element.innerHTML = `
      <img class="mob-image" src="${this.imageUrl}" alt="${this.nom}" />
      <div class="mob-tooltip">
        <div class="mob-info">
          <span class="mob-name" title="Double-cliquez pour renommer">${this.nom}</span>
          <span class="mob-status ${this.status}">${this.status}</span>
        </div>
        <div class="mob-stats">
          <div class="mob-stat mob-stat-vie">
            <span class="mob-stat-label">Vie</span>
            <div class="mob-stat-bar">
              <div class="mob-stat-fill" style="width: ${this.vie}%"></div>
            </div>
          </div>
          <div class="mob-stat mob-stat-energie">
            <span class="mob-stat-label">Énergie</span>
            <div class="mob-stat-bar">
              <div class="mob-stat-fill" style="width: ${this.energie}%"></div>
            </div>
          </div>
          <div class="mob-stat mob-stat-faim">
            <span class="mob-stat-label">Faim</span>
            <div class="mob-stat-bar">
              <div class="mob-stat-fill" style="width: ${this.faim}%"></div>
            </div>
          </div>
        </div>
      </div>
    `

    // Ajouter l'événement click pour sélectionner ce mob ou appliquer une action
    this.element.addEventListener('click', () => {
      if (onMobClickCallback) {
        onMobClickCallback(this)
      } else {
        setSelectedMob(this)
      }
    })

    // Ajouter l'événement double-click pour renommer le mob (sur le nom dans le tooltip)
    const nameElement = this.element.querySelector('.mob-name') as HTMLElement
    if (nameElement) {
      nameElement.addEventListener('dblclick', (e) => {
        e.stopPropagation() // Empêcher la sélection du mob
        this.startRenaming(nameElement)
      })
    }

    // Ajouter l'événement double-click sur l'image pour renommer quand aucune action n'est sélectionnée
    const imageElement = this.element.querySelector('.mob-image') as HTMLElement
    if (imageElement) {
      imageElement.addEventListener('dblclick', (e) => {
        // Vérifier si un mode d'action est actif
        const isActionActive = isActionModeActiveCallback ? isActionModeActiveCallback() : false
        if (!isActionActive) {
          e.stopPropagation()
          this.startRenaming(nameElement)
        }
      })
    }

    container.appendChild(this.element)
    this.updateDisplay()

    // Démarrer le comportement autonome si vivant
    if (this.status === 'vivant') {
      this.startBehavior()
    }

    return this.element
  }

  /**
   * Supprime le mob du DOM
   */
  destroy(): void {
    this.stopBehavior()
    if (this.element) {
      this.element.remove()
      this.element = null
    }
  }
}

