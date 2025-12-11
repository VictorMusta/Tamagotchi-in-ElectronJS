export type MobStatus = 'vivant' | 'mort'

// Interface pour la sérialisation des mobs
export interface MobData {
  nom: string
  imageUrl: string
  vie: number
  energie: number
  faim: number
  status: MobStatus
}

// Gestionnaire global pour le mob sélectionné
let selectedMob: Mob | null = null

// Callback pour valider/modifier le nom lors du renommage
let onRenameCallback: ((mob: Mob, newName: string) => string) | null = null

// Callback pour les clics sur les mobs
let onMobClickCallback: ((mob: Mob) => void) | null = null

// Callback pour vérifier si une action est sélectionnée
let isActionModeActiveCallback: (() => boolean) | null = null

export function getSelectedMob(): Mob | null {
  return selectedMob
}

export function setSelectedMob(mob: Mob | null): void {
  // Retirer la classe selected de l'ancien mob
  if (selectedMob) {
    selectedMob.setSelected(false)
  }
  selectedMob = mob
  // Ajouter la classe selected au nouveau mob
  if (selectedMob) {
    selectedMob.setSelected(true)
  }
}

/**
 * Définit le callback appelé lors du renommage d'un mob
 * Le callback reçoit le mob et le nouveau nom souhaité, et retourne le nom final
 */
export function setOnRenameCallback(callback: (mob: Mob, newName: string) => string): void {
  onRenameCallback = callback
}

/**
 * Définit le callback appelé lors d'un clic sur un mob
 */
export function setOnMobClick(callback: (mob: Mob) => void): void {
  onMobClickCallback = callback
}

/**
 * Définit le callback pour vérifier si un mode d'action est actif
 */
export function setIsActionModeActive(callback: () => boolean): void {
  isActionModeActiveCallback = callback
}

export class Mob {
  vie: number
  energie: number
  faim: number
  status: MobStatus
  nom: string
  imageUrl: string
  private element: HTMLElement | null = null

  // Propriétés de mouvement
  private posX: number = 0
  private targetX: number = 0
  private isMoving: boolean = false
  private facingLeft: boolean = false
  private moveInterval: ReturnType<typeof setInterval> | null = null
  private thinkInterval: ReturnType<typeof setInterval> | null = null
  private isRenaming: boolean = false

  constructor(
    nom: string,
    imageUrl: string,
    vie: number = 100,
    energie: number = 100,
    faim: number = 0
  ) {
    this.nom = nom
    this.imageUrl = imageUrl
    this.vie = vie
    this.energie = energie
    this.faim = faim
    this.status = vie > 0 ? 'vivant' : 'mort'

    // Position initiale aléatoire
    this.posX = Math.random() * (window.innerWidth - 100)
    this.targetX = this.posX
  }

  /**
   * Met à jour le statut du mob en fonction de sa vie
   */
  updateStatus(): void {
    this.status = this.vie > 0 ? 'vivant' : 'mort'
  }

  /**
   * Inflige des dégâts au mob
   */
  takeDamage(amount: number): void {
    this.vie = Math.max(0, this.vie - amount)
    this.updateStatus()
    this.updateDisplay()
  }

  /**
   * Soigne le mob
   */
  heal(amount: number): void {
    if (this.status === 'mort') return // Ne peut pas soigner un mob mort
    this.vie = Math.min(100, this.vie + amount)
    this.updateStatus()
    this.updateDisplay()
  }

  /**
   * Nourrit le mob (diminue la faim)
   */
  feed(amount: number): void {
    if (this.status === 'mort') return
    this.faim = Math.max(0, this.faim - amount)
    this.updateDisplay()
  }

  /**
   * Réanime le mob
   */
  revive(): void {
    if (this.status === 'vivant') return // Déjà vivant
    this.vie = 50 // Revient avec 50% de vie
    this.energie = 50
    this.faim = 50
    this.updateStatus()
    this.updateDisplay()
    // Redémarrer le comportement autonome
    this.startBehavior()
  }

  /**
   * Modifie l'énergie du mob
   */
  setEnergie(amount: number): void {
    this.energie = Math.max(0, Math.min(100, amount))
    this.updateDisplay()
  }

  /**
   * Modifie la faim du mob
   */
  setFaim(amount: number): void {
    this.faim = Math.max(0, Math.min(100, amount))
    this.updateDisplay()
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
      const actualDistance = Math.min(Math.abs(distance), Math.abs(jumpDistance)) * Math.sign(distance)
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

    const finishRenaming = (): void => {
      let newName = input.value.trim()
      if (newName && newName !== currentName) {
        // Utiliser le callback pour obtenir un nom unique si nécessaire
        if (onRenameCallback) {
          newName = onRenameCallback(this, newName)
        }
        this.nom = newName
      }
      nameElement.textContent = this.nom
      nameElement.style.display = ''
      input.remove()

      // Redémarrer le comportement après le renommage
      this.isRenaming = false
      this.startBehavior()
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

    // Arrêter le mouvement si le mob meurt
    if (this.status === 'mort') {
      this.stopBehavior()
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

    // Démarrer le comportement autonome
    this.startBehavior()

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

  /**
   * Sérialise le mob en objet JSON
   */
  toJSON(): MobData {
    return {
      nom: this.nom,
      imageUrl: this.imageUrl,
      vie: this.vie,
      energie: this.energie,
      faim: this.faim,
      status: this.status
    }
  }

  /**
   * Crée un mob à partir de données sérialisées
   */
  static fromJSON(data: MobData): Mob {
    const mob = new Mob(data.nom, data.imageUrl, data.vie, data.energie, data.faim)
    mob.status = data.status
    return mob
  }
}
