import { FallenMob } from '../../../shared/types'

export class MemorialUI {
  private overlay: HTMLElement | null = null

  /**
   * Show the memorial screen with all fallen mobs
   */
  async show(): Promise<void> {
    const result = await window.api.getMemorial()
    if (!result.success) {
      console.error('[MemorialUI] Failed to load memorial:', result.error)
      return
    }

    const fallen = result.fallen || []
    this.render(fallen)
  }

  private render(fallen: FallenMob[]): void {
    this.overlay = document.createElement('div')
    this.overlay.className = 'memorial-overlay'
    this.overlay.innerHTML = `
      <div class="memorial-modal">
        <div class="memorial-header">
          <h2>⚰️ Mémorial</h2>
          <p class="memorial-subtitle">En mémoire de nos braves patates tombées au combat</p>
        </div>

        <div class="memorial-content">
          ${fallen.length === 0 
            ? '<p class="memorial-empty">Aucune patate n\'est encore tombée au combat. 🙏</p>'
            : `<div class="memorial-grid">${fallen.map(mob => this.renderFallenMob(mob)).join('')}</div>`
          }
        </div>

        <div class="memorial-footer">
          <button class="memorial-close-btn">Fermer</button>
        </div>
      </div>
    `

    document.body.appendChild(this.overlay)
    this.bindEvents()
  }

  private renderFallenMob(mob: FallenMob): string {
    const date = new Date(mob.dateOfDeath).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    return `
      <div class="memorial-card">
        <div class="memorial-avatar">
          <div class="memorial-placeholder">🥔</div>
          <div class="memorial-skull">💀</div>
        </div>
        <div class="memorial-info">
          <span class="memorial-name">${mob.nom}</span>
          <span class="memorial-level">Niveau ${mob.level}</span>
          <span class="memorial-date">† ${date}</span>
          <span class="memorial-killer">Tué par: ${mob.killedBy}</span>
        </div>
        <div class="memorial-stats">
          <div class="memorial-stat">
            <span class="memorial-stat-label">Victoires</span>
            <span class="memorial-stat-value">${mob.combatProgress.wins}</span>
          </div>
          <div class="memorial-stat">
            <span class="memorial-stat-label">Meilleure série</span>
            <span class="memorial-stat-value">${mob.combatProgress.winStreak}</span>
          </div>
        </div>
        <div class="memorial-traits">
          ${mob.traits.length > 0 
            ? mob.traits.map(t => `<span class="memorial-trait">${t}</span>`).join('')
            : '<span class="memorial-no-traits">Aucun trait</span>'
          }
        </div>
      </div>
    `
  }

  private bindEvents(): void {
    if (!this.overlay) return

    const closeBtn = this.overlay.querySelector('.memorial-close-btn')
    closeBtn?.addEventListener('click', () => this.close())

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close()
      }
    })
  }

  private close(): void {
    if (this.overlay) {
      this.overlay.remove()
      this.overlay = null
    }
  }

  destroy(): void {
    this.close()
  }
}
