import { MobData } from '../../shared/types'
import { TRAIT_DEFINITIONS } from './mob/TraitDefinitions'
import { WEAPON_REGISTRY } from '../../shared/WeaponRegistry'

export class ProfileRenderer {
  private overlay: HTMLElement | null = null

  constructor() { }

  /**
   * Affiche l'overlay de profil pour un mob donné
   */
  render(mob: MobData, onClose: () => void, onUpdate?: (mobId: string, mob: MobData) => void): void {
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
              ${this.getStatBarHtml(mob.stats.force, '#ff4757')}
            </div>
            <div class="stat-item">
              <span class="stat-label">VIT</span>
              <span class="stat-value">${mob.stats.vitalite}</span>
              ${this.getStatBarHtml(mob.stats.vitalite, '#2ed573')}
            </div>
            <div class="stat-item">
              <span class="stat-label">AGI</span>
              <span class="stat-value">${mob.stats.agilite}</span>
              ${this.getStatBarHtml(mob.stats.agilite, '#1e90ff')}
            </div>
            <div class="stat-item">
              <span class="stat-label">SPD</span>
              <span class="stat-value">${mob.stats.vitesse}</span>
              ${this.getStatBarHtml(mob.stats.vitesse, '#f1c40f')}
            </div>
          </div>
          
           ${mob.weapons && mob.weapons.length > 0 ? `
          <div class="weapon-section" style="margin-top: 15px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">
            <div style="font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Arsenal (${mob.weapons.length})</div>
            <div class="arsenal-grid" style="display: flex; gap: 8px; flex-wrap: wrap;">
                ${mob.weapons.map(w => {
                    const def = WEAPON_REGISTRY[w]
                    const icon = def?.icon || 'toothpick.png'
                    return `
                    <div class="weapon-item" data-weapon="${w}" style="
                        width: 48px; height: 48px; 
                        background: rgba(255,255,255,0.05); 
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 6px; 
                        display: flex; justify-content: center; align-items: center; 
                        cursor: help;
                        position: relative;
                        transition: all 0.2s;
                    ">
                        <img src="./assets/weapons/${icon}" style="width: 32px; height: 32px; image-rendering: pixelated; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.5));" />
                    </div>
                    `
                }).join('')}
            </div>
          </div>
          ` : ''}

          <div class="traits-section">
            <h3>Mutations</h3>
            <div class="traits-list">
              ${mob.traits.map(trait => {
                return `<span class="trait-tag" data-trait="${trait}">${trait}</span>`
                }).join('')}
            </div>
          </div>


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

    // Append tooltip to overlay directly to avoid relative positioning issues from profile-card
    const tooltipEl = document.createElement('div')
    tooltipEl.id = 'trait-tooltip'
    tooltipEl.className = 'trait-tooltip'
    tooltipEl.style.display = 'none'
    tooltipEl.style.position = 'absolute'
    this.overlay.appendChild(tooltipEl)

    // Events de customisation
    this.overlay.querySelectorAll('.skin-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement
        const type = target.dataset.type as 'hat'
        const value = target.value

        // Mise à jour visuelle immédiate du calque
        const layer = this.overlay?.querySelector(`.${type}-layer`)
        if (layer) {
          layer.className = `layer ${type}-layer ${value}`
        }

        window.api.updateMobSkin(mob.id, type, value).then((result) => {
          if (result.success && result.mob && onUpdate) {
            onUpdate(mob.id, result.mob)
          }
        })
      })
    })

    // Helper for tooltip positioning
    const positionTooltip = (target: HTMLElement, content: string) => {
         tooltipEl.innerHTML = content
         tooltipEl.style.display = 'block'
         
         const rect = target.getBoundingClientRect()
         const tooltipWidth = tooltipEl.offsetWidth
         const tooltipHeight = tooltipEl.offsetHeight

         let left = rect.left + (rect.width / 2) - (tooltipWidth / 2)
         let top = rect.top - tooltipHeight - 10

         if (left < 10) left = 10
         if (left + tooltipWidth > window.innerWidth - 10) left = window.innerWidth - tooltipWidth - 10
         if (top < 10) top = rect.bottom + 10

         tooltipEl.style.left = `${left}px`
         tooltipEl.style.top = `${top}px`
    }

    // Trait Tooltip Events
    this.overlay.querySelectorAll('.trait-tag').forEach(tag => {
      tag.addEventListener('mouseenter', (e) => {
        const target = e.target as HTMLElement
        const traitName = target.dataset.trait
        if (traitName && TRAIT_DEFINITIONS[traitName]) {
          const def = TRAIT_DEFINITIONS[traitName]
          const html = `
            <h4>${traitName}</h4>
            <p>${def.description}</p>
            ${def.effect ? `<p class="tooltip-effect"><strong>Effet:</strong> ${def.effect}</p>` : ''}
            ${def.stats ? `<p class="tooltip-stats"><strong>Stats:</strong> ${def.stats}</p>` : ''}
          `
          positionTooltip(target, html)
        }
      })

      tag.addEventListener('mouseleave', () => {
        tooltipEl.style.display = 'none'
      })
    })

    // Weapon Tooltip Events
    this.overlay.querySelectorAll('.weapon-item').forEach(item => {
        item.addEventListener('mouseenter', (e) => {
            const target = e.target as HTMLElement
            const weaponName = target.dataset.weapon
            const def = weaponName ? WEAPON_REGISTRY[weaponName] : null
            
            if (def) {
                const html = `
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:5px; border-bottom:1px solid rgba(255,255,255,0.2); padding-bottom:5px;">
                        <img src="./assets/weapons/${def.icon}" style="width:24px; height:24px;" />
                        <h4 style="margin:0;">${def.name}</h4>
                    </div>
                    <p style="font-size:11px; margin-bottom:5px; color:#ddd;">${def.description}</p>
                    <div style="font-size:10px; display:grid; grid-template-columns:1fr 1fr; gap:4px;">
                        <span style="color:#ff7675;">Dmg +${def.damageBonus}</span>
                        <span style="color:#74b9ff;">Type: ${def.type}</span>
                        ${def.statBonus ? `<span style="color:#ffeaa7;">+${def.statBonus.amount} ${def.statBonus.stat}</span>` : ''}
                    </div>
                    ${def.effects ? `
                    <div style="margin-top:5px; font-size:10px; color:#a29bfe;">
                        ${def.effects.stunChance ? `<div>💫 Stun ${def.effects.stunChance * 100}%</div>` : ''}
                        ${def.effects.blockChance ? `<div>🛡️ Block ${(def.effects.blockChance * 100)}%</div>` : ''}
                        ${def.effects.counterChance ? `<div>↩️ Counter ${(def.effects.counterChance * 100)}%</div>` : ''}
                    </div>
                    ` : ''}
                `
                positionTooltip(target, html)
            }
        })
        
        item.addEventListener('mouseleave', () => {
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
            this.render(result.mob, onClose, onUpdate)
            if (onUpdate) onUpdate(result.mob.id, result.mob)
          } else {
            alert(result.error || 'Erreur lors du renommage')
            this.render(mob, onClose, onUpdate)
          }
        } else {
          this.render(mob, onClose, onUpdate)
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

  private getStatBarHtml(value: number, baseColor: string): string {
    const MAX_PER_BAR = 30
    const TIERS = [
        baseColor,
        '#00d2d3', // Cyan
        '#a29bfe', // Purple
        '#ff9f43', // Orange
        '#ff7675'  // Salmon
    ]
    
    // 0-30 -> Tier 0
    let tier = Math.floor((value - 0.1) / MAX_PER_BAR)
    if (tier < 0) tier = 0
    
    // Colors
    const fgColor = TIERS[tier] || TIERS[TIERS.length - 1]
    const bgColor = tier > 0 ? TIERS[tier - 1] : 'rgba(255,255,255,0.1)' 
    
    // Width
    const remainder = value - (tier * MAX_PER_BAR)
    const widthPct = Math.min(100, (remainder / MAX_PER_BAR) * 100)
    
    return `<div class="stat-bar" style="background: ${bgColor}; box-shadow: inset 0 0 5px rgba(0,0,0,0.5);">
              <div class="stat-fill" style="width: ${widthPct}%; background: ${fgColor}; box-shadow: 0 0 10px ${fgColor};"></div>
            </div>`
  }
}
