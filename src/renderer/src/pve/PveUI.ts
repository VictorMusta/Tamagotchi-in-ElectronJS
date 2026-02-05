import { MobData } from '../../../shared/types'
const potatoImage = 'assets/Potato still.png'

export class PveUI {
  private overlay: HTMLElement | null = null
  private currentMobId: string | null = null
  private enemies: MobData[] = []
  private onFightCallback: ((enemy: MobData) => void) | null = null
  private onCancelCallback: (() => void) | null = null

  /**
   * Show PvE enemy selection menu
   */
  async showEnemySelection(
    playerMob: MobData,
    onFight: (enemy: MobData) => void,
    onCancel: () => void
  ): Promise<void> {
    this.onFightCallback = onFight
    this.onCancelCallback = onCancel
    this.currentMobId = playerMob.id

    // Get or generate enemies for this mob
    const result = await window.api.getPveEnemies(playerMob.id, playerMob.level)
    if (!result.success || !result.enemies) {
      console.error('[PveUI] Failed to get enemies:', result.error)
      onCancel()
      return
    }

    this.enemies = result.enemies
    this.render(playerMob)
  }

  private render(playerMob: MobData): void {
    // Create overlay
    this.overlay = document.createElement('div')
    this.overlay.className = 'pve-overlay'
    this.overlay.innerHTML = `
      <div class="pve-modal">
        <div class="pve-header">
          <h2>⚔️ COMBAT PvE</h2>
          <p class="pve-warning">⚠️ ATTENTION: La mort est permanente !</p>
        </div>

        <div class="pve-player-section">
          <div class="pve-player-card">
            <img src="${playerMob.imageUrl || potatoImage}" class="pve-mob-image" />
            <div class="pve-mob-info">
              <span class="pve-mob-name">${playerMob.nom}</span>
              <span class="pve-mob-level">Niv. ${playerMob.level}</span>
              
              <div class="pve-mob-stats">
                <span>FOR: ${playerMob.stats.force}</span>
                <span>VIT: ${playerMob.stats.vitalite}</span>
                <span>VIS: ${playerMob.stats.vitesse}</span>
                <span>AGI: ${playerMob.stats.agilite}</span>
              </div>
              
              <div class="pve-mob-traits">
                <span class="pve-trait-label">Traits:</span> ${playerMob.traits.length > 0 ? playerMob.traits.slice(0, 3).join(', ') : 'Aucun'}
              </div>
              
              ${playerMob.weapons.length > 0 ? `<div class="pve-mob-weapons">🗡️ ${playerMob.weapons.length} arme(s)</div>` : ''}
            </div>
          </div>
          <span class="pve-vs">VS</span>
        </div>

        <div class="pve-enemies-section">
          <h3>Choisissez votre adversaire</h3>
          <div class="pve-enemies-grid">
            ${this.enemies.map((enemy, index) => this.renderEnemyCard(enemy, index)).join('')}
          </div>
        </div>

        <div class="pve-footer">
          <button class="pve-cancel-btn">Annuler</button>
        </div>
      </div>
    `

    document.body.appendChild(this.overlay)

    // Bind events
    this.bindEvents()
  }

  private renderEnemyCard(enemy: MobData, index: number): string {
    const traitList = enemy.traits.length > 0 ? enemy.traits.slice(0, 3).join(', ') : 'Aucun'

    return `
      <div class="pve-enemy-card" data-index="${index}">
        <div class="pve-enemy-avatar">
          <div class="pve-enemy-placeholder">🥔</div>
          <div class="pve-hat-layer ${enemy.skin.hat}"></div>
        </div>
        <div class="pve-enemy-info">
          <span class="pve-enemy-name">${enemy.nom}</span>
          <span class="pve-enemy-level">Niv. ${enemy.level}</span>
          <div class="pve-enemy-stats">
            <span>FOR: ${enemy.stats.force}</span>
            <span>VIT: ${enemy.stats.vitalite}</span>
            <span>VIS: ${enemy.stats.vitesse}</span>
            <span>AGI: ${enemy.stats.agilite}</span>
          </div>
          <div class="pve-enemy-traits">
            <span class="pve-trait-label">Traits:</span> ${traitList}
          </div>
          ${enemy.weapons.length > 0 ? `<div class="pve-enemy-weapons">🗡️ ${enemy.weapons.length} arme(s)</div>` : ''}
        </div>
        <button class="pve-fight-btn">COMBATTRE</button>
      </div>
    `
  }

  private bindEvents(): void {
    if (!this.overlay) return

    // Cancel button
    const cancelBtn = this.overlay.querySelector('.pve-cancel-btn')
    cancelBtn?.addEventListener('click', () => this.close())

    // Fight buttons
    const fightBtns = this.overlay.querySelectorAll('.pve-fight-btn')
    fightBtns.forEach((btn, index) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.selectEnemy(index)
      })
    })

    // Enemy card click (as alternative to button)
    const enemyCards = this.overlay.querySelectorAll('.pve-enemy-card')
    enemyCards.forEach((card) => {
      card.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        if (target.classList.contains('pve-fight-btn')) return // Already handled
        const index = parseInt(card.getAttribute('data-index') || '0')
        this.selectEnemy(index)
      })
    })

    // Click outside to close
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close()
      }
    })
  }

  private selectEnemy(index: number): void {
    const enemy = this.enemies[index]
    if (!enemy) return

    console.log(`[PveUI] Selected enemy: ${enemy.nom}`)

    // Clear cache for this mob since fight is starting
    if (this.currentMobId) {
      window.api.clearPveCache(this.currentMobId)
    }

    this.close()

    if (this.onFightCallback) {
      this.onFightCallback(enemy)
    }
  }

  private close(): void {
    if (this.overlay) {
      this.overlay.remove()
      this.overlay = null
    }

    if (this.onCancelCallback && !this.onFightCallback) {
      this.onCancelCallback()
    }
  }

  /**
   * Destroy the UI (cleanup)
   */
  destroy(): void {
    this.close()
    this.onFightCallback = null
    this.onCancelCallback = null
    this.enemies = []
    this.currentMobId = null
  }
}
