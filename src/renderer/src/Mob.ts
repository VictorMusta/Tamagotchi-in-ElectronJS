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

export class Mob {
  vie: number
  energie: number
  faim: number
  status: MobStatus
  nom: string
  imageUrl: string
  private element: HTMLElement | null = null

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
   * Démarre le mode de renommage du mob
   */
  private startRenaming(nameElement: HTMLElement): void {
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
      const newName = input.value.trim()
      if (newName && newName !== currentName) {
        this.nom = newName
      }
      nameElement.textContent = this.nom
      nameElement.style.display = ''
      input.remove()
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
  }

  /**
   * Rend le mob visible dans le DOM
   */
  render(container: HTMLElement): HTMLElement {
    this.element = document.createElement('div')
    this.element.className = 'mob'
    this.element.innerHTML = `
      <img class="mob-image" src="${this.imageUrl}" alt="${this.nom}" />
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
    `

    // Ajouter l'événement click pour sélectionner ce mob
    this.element.addEventListener('click', () => {
      setSelectedMob(this)
    })

    // Ajouter l'événement double-click pour renommer le mob
    const nameElement = this.element.querySelector('.mob-name') as HTMLElement
    if (nameElement) {
      nameElement.addEventListener('dblclick', (e) => {
        e.stopPropagation() // Empêcher la sélection du mob
        this.startRenaming(nameElement)
      })
    }

    container.appendChild(this.element)
    this.updateDisplay()
    return this.element
  }

  /**
   * Supprime le mob du DOM
   */
  destroy(): void {
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
