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
      <div class="mob-tooltip">
        <div class="mob-info">
          <span class="mob-name" title="Double-cliquez pour renommer">${this.data.nom}</span>
          <span class="mob-status ${this.data.status}">${this.data.status}</span>
        </div>
        <div class="mob-stats">
          <div class="mob-stat mob-stat-vie">
            <span class="mob-stat-label">Vie</span>
            <div class="mob-stat-bar">
              <div class="mob-stat-fill" style="width: ${this.data.vie}%"></div>
            </div>
          </div>
          <div class="mob-stat mob-stat-energie">
            <span class="mob-stat-label">Énergie</span>
            <div class="mob-stat-bar">
              <div class="mob-stat-fill" style="width: ${this.data.energie}%"></div>
            </div>
          </div>
          <div class="mob-stat mob-stat-faim">
            <span class="mob-stat-label">Faim</span>
            <div class="mob-stat-bar">
              <div class="mob-stat-fill" style="width: ${this.data.faim}%"></div>
            </div>
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

        const img = this.element.querySelector('.mob-image') as HTMLImageElement
        if (img) {
            img.style.filter = data.status === 'mort' ? 'grayscale(100%)' : 'none'
            img.style.opacity = data.status === 'mort' ? '0.5' : '1'
        }

        const vieBar = this.element.querySelector('.mob-stat-vie .mob-stat-fill') as HTMLElement
        const energieBar = this.element.querySelector('.mob-stat-energie .mob-stat-fill') as HTMLElement
        const faimBar = this.element.querySelector('.mob-stat-faim .mob-stat-fill') as HTMLElement

        if (vieBar) vieBar.style.width = `${data.vie}%`
        if (energieBar) energieBar.style.width = `${data.energie}%`
        if (faimBar) faimBar.style.width = `${data.faim}%`

        const statusEl = this.element.querySelector('.mob-status') as HTMLElement
        if (statusEl) {
            statusEl.textContent = data.status
            statusEl.className = `mob-status ${data.status}`
        }

        const nameEl = this.element.querySelector('.mob-name') as HTMLElement
        if (nameEl) {
            nameEl.textContent = data.nom
        }
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
