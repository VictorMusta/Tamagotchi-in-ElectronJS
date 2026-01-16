import { MobData } from '../../../shared/types'

export class MobDisplay {
  private element: HTMLElement | null = null

  constructor(private data: MobData) { }

  render(container: HTMLElement, onAction: () => void, onRename: (element: HTMLElement) => void): HTMLElement {
    this.element = document.createElement('div')
    this.element.className = 'mob'

    // Position handled by MobMovement, but initial setup here
    this.element.innerHTML = `
      <img class="mob-image" src="${this.data.imageUrl}" alt="${this.data.nom}" />
      <div class="skin-layers">
         <div class="layer bottom-layer ${this.data.skin?.bottom || 'none'}"></div>
         <div class="layer hat-layer ${this.data.skin?.hat || 'none'}"></div>
      </div>
      <div class="mob-tooltip">
        <div class="mob-info">
          <div class="mob-identity">
              <span class="mob-level-badge">Level ${this.data.level || 1}</span>
              <span class="mob-name" title="Double-cliquez pour renommer">${this.data.nom}</span>
          </div>
        </div>
        
        <div class="mob-xp-container">
            <div class="mob-xp-bar">
                <div class="mob-xp-fill" style="width: ${this.calculateXpPercentage()}%"></div>
            </div>
            <span class="mob-xp-text">XP ${this.data.experience || 0} / ${this.calculateNextLevelXp()}</span>
        </div>

        <div class="mob-stats-grid">
            <div class="mob-stat-column">
                <div class="mob-stat mob-stat-vie">
                    <span class="mob-stat-label">Vie</span>
                    <div class="mob-stat-bar"><div class="mob-stat-fill" style="width: ${(this.data.vie / this.getMaxHP()) * 100}%"></div></div>
                </div>
                <div class="mob-stat mob-stat-energie">
                    <span class="mob-stat-label">Énergie</span>
                    <div class="mob-stat-bar"><div class="mob-stat-fill" style="width: ${this.data.energie}%"></div></div>
                </div>
            </div>
            
            <div class="mob-attributes-column">
                <div class="attribute-row"><span class="attr-label">FOR</span> <span class="attr-val val-force">${this.data.stats?.force || 0}</span></div>
                <div class="attribute-row"><span class="attr-label">VIT</span> <span class="attr-val val-vitalite">${this.data.stats?.vitalite || 0}</span></div>
                <div class="attribute-row"><span class="attr-label">AGI</span> <span class="attr-val val-agilite">${this.data.stats?.agilite || 0}</span></div>
                <div class="attribute-row"><span class="attr-label">SPD</span> <span class="attr-val val-vitesse">${this.data.stats?.vitesse || 0}</span></div>
            </div>
        </div>
      </div>
    `

    this.element.addEventListener('click', onAction)

    const nameElement = this.element.querySelector('.mob-name') as HTMLElement
    if (nameElement) {
      nameElement.addEventListener('dblclick', (_e) => {
        _e.stopPropagation()
        onRename(nameElement)
      })
    }

    const imageElement = this.element.querySelector('.mob-image') as HTMLElement
    if (imageElement) {
      imageElement.addEventListener('dblclick', (_e) => {
        onRename(nameElement)
      })
    }

    container.appendChild(this.element)
    this.update(this.data)

    return this.element
  }

  update(data: MobData): void {
    this.data = data
    if (!this.element) return

    this.element.classList.toggle('dead', data.status === 'mort')

    const vieBar = this.element.querySelector('.mob-stat-vie .mob-stat-fill') as HTMLElement
    const energieBar = this.element.querySelector('.mob-stat-energie .mob-stat-fill') as HTMLElement

    if (vieBar) vieBar.style.width = `${data.vie}%`
    if (energieBar) energieBar.style.width = `${data.energie}%`


    const nameEl = this.element.querySelector('.mob-name') as HTMLElement
    if (nameEl) {
      nameEl.textContent = data.nom
    }

    // Update skins
    const hatLayer = this.element.querySelector('.hat-layer') as HTMLElement
    const bottomLayer = this.element.querySelector('.bottom-layer') as HTMLElement

    if (hatLayer) hatLayer.className = `layer hat-layer ${data.skin?.hat || 'none'}`
    if (bottomLayer) bottomLayer.className = `layer bottom-layer ${data.skin?.bottom || 'none'}`

    // Update RPG Stats
    const valForce = this.element.querySelector('.val-force')
    const valVit = this.element.querySelector('.val-vitalite')
    const valAgi = this.element.querySelector('.val-agilite')
    const valSpd = this.element.querySelector('.val-vitesse')

    if (valForce) valForce.textContent = String(data.stats?.force || 0)
    if (valVit) valVit.textContent = String(data.stats?.vitalite || 0)
    if (valAgi) valAgi.textContent = String(data.stats?.agilite || 0)
    if (valSpd) valSpd.textContent = String(data.stats?.vitesse || 0)

    // Update Level & XP
    const levelBadge = this.element.querySelector('.mob-level-badge') as HTMLElement
    const xpFill = this.element.querySelector('.mob-xp-fill') as HTMLElement
    const xpText = this.element.querySelector('.mob-xp-text')

    if (levelBadge) {
      const lvl = data.level || 1
      levelBadge.textContent = `Level ${lvl}`

      // Clear previous level classes
      levelBadge.classList.remove('lvl-1', 'lvl-2-3', 'lvl-4plus')

      // Apply new color class
      if (lvl === 1) levelBadge.classList.add('lvl-1')
      else if (lvl <= 3) levelBadge.classList.add('lvl-2-3')
      else levelBadge.classList.add('lvl-4plus')
    }
    if (xpFill) xpFill.style.width = `${this.calculateXpPercentage()}%`
    if (xpText) xpText.textContent = `XP ${data.experience || 0} / ${this.calculateNextLevelXp()}`

    // Update HP bar (recalc based on MaxHP)
    if (vieBar) vieBar.style.width = `${(data.vie / this.getMaxHP()) * 100}%`
  }

  private calculateNextLevelXp(): number {
    const level = this.data.level || 1
    return Math.floor(100 * Math.pow(1.5, level - 1))
  }

  private calculateXpPercentage(): number {
    const xp = this.data.experience || 0
    const target = this.calculateNextLevelXp()
    return Math.min(100, Math.max(0, (xp / target) * 100))
  }

  private getMaxHP(): number {
    const vitalite = this.data.stats?.vitalite || 0
    return 100 + (vitalite * 5)
  }

  getElement(): HTMLElement | null {
    return this.element
  }

  setSelected(selected: boolean): void {
    if (!this.element) return
    this.element.classList.toggle('selected', selected)
  }

  destroy(): void {
    if (this.element) {
      this.element.remove()
      this.element = null
    }
  }
}
