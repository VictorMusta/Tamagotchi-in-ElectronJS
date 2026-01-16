import { MobData } from '../../shared/types'
import { TRAIT_DEFINITIONS } from './mob/TraitDefinitions'

export class ProfileRenderer {
  private overlay: HTMLElement | null = null

  constructor() { }

  /**
   * Affiche l'overlay de profil pour un mob donné
   */
  render(mob: MobData, onClose: () => void, onRename?: (newName: string) => void): void {
    // Supprimer l'ancien overlay si existant
    this.destroy()

    this.overlay = document.createElement('div')
    this.overlay.id = 'profile-overlay'
    this.overlay.className = 'overlay active'

    this.overlay.innerHTML = `
      <div class="profile-card">
        <button class="close-btn">&times;</button>
        
        <div class="profile-header">
          <div class="profile-avatar-container">
            <img src="${mob.imageUrl}" class="profile-avatar" />
            <div class="skin-layers">
                <div class="layer hat-layer ${mob.skin.hat}"></div>
                <div class="layer bottom-layer ${mob.skin.bottom}"></div>
            </div>
          </div>
          <div class="profile-name-container">
            <h2 class="profile-name">${mob.nom}</h2>
            <button class="edit-name-btn" title="Renommer">✏️</button>
          </div>
          <div class="profile-status ${mob.status}">${mob.status}</div>
        </div>

        <div class="profile-content">
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">FOR</span>
              <span class="stat-value">${mob.stats.force}</span>
              <div class="stat-bar"><div class="stat-fill" style="width: ${mob.stats.force * 5}%; background: #ff4757;"></div></div>
            </div>
            <div class="stat-item">
              <span class="stat-label">VIT</span>
              <span class="stat-value">${mob.stats.vitalite}</span>
              <div class="stat-bar"><div class="stat-fill" style="width: ${mob.stats.vitalite * 5}%; background: #2ed573;"></div></div>
            </div>
            <div class="stat-item">
              <span class="stat-label">AGI</span>
              <span class="stat-value">${mob.stats.agilite}</span>
              <div class="stat-bar"><div class="stat-fill" style="width: ${mob.stats.agilite * 5}%; background: #1e90ff;"></div></div>
            </div>
            <div class="stat-item">
              <span class="stat-label">SPD</span>
              <span class="stat-value">${mob.stats.vitesse}</span>
              <div class="stat-bar"><div class="stat-fill" style="width: ${mob.stats.vitesse * 5}%; background: #f1c40f;"></div></div>
            </div>
          </div>

          <div class="traits-section">
            <h3>Mutations</h3>
            <div class="traits-list">
              ${mob.traits.map(trait => {
      return `<span class="trait-tag" data-trait="${trait}">${trait}</span>`
    }).join('')}
            </div>
          </div>

          <!-- Tooltip Container (will be positioned dynamically) -->
          <div id="trait-tooltip" class="trait-tooltip" style="display: none; position: absolute; z-index: 1000;"></div>

          <div class="customization-section">
            <h3>Customisation</h3>
            <div class="custom-row">
              <label>Chapeau</label>
              <select class="skin-select" data-type="hat">
                <option value="none" ${mob.skin.hat === 'none' ? 'selected' : ''}>Aucun</option>
                <option value="crown" ${mob.skin.hat === 'crown' ? 'selected' : ''}>Couronne</option>
                <option value="cap" ${mob.skin.hat === 'cap' ? 'selected' : ''}>Casquette</option>
                <option value="wizard" ${mob.skin.hat === 'wizard' ? 'selected' : ''}>Sorcier</option>
              </select>
            </div>
            <div class="custom-row">
              <label>Bas</label>
              <select class="skin-select" data-type="bottom">
                <option value="none" ${mob.skin.bottom === 'none' ? 'selected' : ''}>Aucun</option>
                <option value="shorts" ${mob.skin.bottom === 'shorts' ? 'selected' : ''}>Short</option>
                <option value="tu-tu" ${mob.skin.bottom === 'tu-tu' ? 'selected' : ''}>Tu-tu</option>
                <option value="boots" ${mob.skin.bottom === 'boots' ? 'selected' : ''}>Bottes</option>
              </select>
            </div>
          </div>

          <div class="history-section">
             <div class="history-stats">
                <span>Wins: ${mob.combatProgress.wins}</span>
                <span>Losses: ${mob.combatProgress.losses}</span>
                <span>Streak: ${mob.combatProgress.winStreak}</span>
             </div>
          </div>
        </div>
      </div>
    `

    document.body.appendChild(this.overlay)

    // Events de customisation
    this.overlay.querySelectorAll('.skin-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement
        const type = target.dataset.type as 'hat' | 'bottom'
        const value = target.value

        // Mise à jour visuelle immédiate du calque
        const layer = this.overlay?.querySelector(`.${type}-layer`)
        if (layer) {
          layer.className = `layer ${type}-layer ${value}`
        }

        window.api.updateMobSkin(mob.id, type, value)
      })
    })

    // Tooltip Events
    const tooltipEl = this.overlay.querySelector('#trait-tooltip') as HTMLElement
    this.overlay.querySelectorAll('.trait-tag').forEach(tag => {
      tag.addEventListener('mouseenter', (e) => {
        const target = e.target as HTMLElement
        const traitName = target.dataset.trait
        if (traitName && TRAIT_DEFINITIONS[traitName]) {
          const def = TRAIT_DEFINITIONS[traitName]
          tooltipEl.innerHTML = `
            <h4>${traitName}</h4>
            <p>${def.description}</p>
            ${def.effect ? `<p class="tooltip-effect"><strong>Effet:</strong> ${def.effect}</p>` : ''}
            ${def.stats ? `<p class="tooltip-stats"><strong>Stats:</strong> ${def.stats}</p>` : ''}
          `
          tooltipEl.style.display = 'block'

          // Position relative to the tag
          const rect = target.getBoundingClientRect()
          const tooltipRect = tooltipEl.getBoundingClientRect()

          // Centered above the tag
          let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2)
          let top = rect.top - tooltipRect.height - 10

          // Boundary checks
          if (left < 0) left = 10
          if (top < 0) top = rect.bottom + 10 // Show below if no space above

          tooltipEl.style.left = `${left}px`
          tooltipEl.style.top = `${top}px`
        }
      })

      tag.addEventListener('mouseleave', () => {
        tooltipEl.style.display = 'none'
      })
    })

    // Renommage
    const nameContainer = this.overlay.querySelector('.profile-name-container') as HTMLElement
    const nameDisplay = this.overlay.querySelector('.profile-name') as HTMLElement
    const editBtn = this.overlay.querySelector('.edit-name-btn') as HTMLElement

    editBtn?.addEventListener('click', () => {
      const currentName = nameDisplay.textContent || ''
      nameContainer.innerHTML = `
                <input type="text" class="name-input" value="${currentName}" maxLength="20" />
                <button class="save-name-btn">💾</button>
            `

      const input = nameContainer.querySelector('.name-input') as HTMLInputElement
      const saveBtn = nameContainer.querySelector('.save-name-btn') as HTMLElement

      const save = async () => {
        const newName = input.value.trim()
        if (newName && newName !== currentName) {
          const result = await window.api.renameMob(mob.id, newName)
          if (result.success && result.mob) {
            this.render(result.mob, onClose, onRename)
            if (onRename) onRename(result.mob.nom)
          } else {
            alert(result.error || 'Erreur lors du renommage')
            this.render(mob, onClose, onRename)
          }
        } else {
          this.render(mob, onClose, onRename)
        }
      }

      saveBtn.addEventListener('click', save)
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') save()
      })
      input.focus()
    })

    // Events
    this.overlay.querySelector('.close-btn')?.addEventListener('click', () => {
      this.destroy()
      onClose()
    })

    // Fermer au clic sur l'overlay (fond sombre)
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.destroy()
        onClose()
      }
    })
  }

  destroy(): void {
    if (this.overlay) {
      this.overlay.remove()
      this.overlay = null
    }
  }
}
