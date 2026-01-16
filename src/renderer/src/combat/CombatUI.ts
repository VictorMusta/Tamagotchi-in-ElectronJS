import { MobData } from '../../../shared/types'
import { CombatEngine, CombatEvent } from './CombatEngine'

export class CombatUI {
    private selectionOverlay: HTMLElement | null = null
    private combatOverlay: HTMLElement | null = null
    private selectedFighters: MobData[] = []
    private currentFighter1: MobData | null = null
    private currentFighter2: MobData | null = null

    constructor() { }

    /**
     * Affiche le menu de sélection des combattants
     */
    async showSelectionMenu(onStartFight: (f1: MobData, f2: MobData) => void): Promise<void> {
        console.log('[CombatUI] Requesting mobs for selection menu...')
        const result = await window.api.getAllMobs()
        console.log('[CombatUI] Mobs result:', result)

        if (!result.success || !result.mobs) {
            console.error('[CombatUI] Failed to load mobs or no mobs found')
            return
        }

        if (result.mobs.length === 0) {
            console.warn('[CombatUI] No mobs in the biome!')
        }

        this.selectedFighters = []
        this.destroySelection()

        this.selectionOverlay = document.createElement('div')
        this.selectionOverlay.id = 'combat-selection-overlay'
        this.selectionOverlay.className = 'overlay active'

        this.selectionOverlay.innerHTML = `
      <div class="selection-card">
        <button class="close-btn">&times;</button>
        <h2>BASTON !</h2>
        <p class="selection-subtitle">Sélectionnez 2 patates pour le duel</p>
        
        <div class="mobs-grid">
          ${result.mobs.map(mob => `
            <div class="mob-selection-card ${mob.status === 'mort' ? 'disabled' : ''}" data-id="${mob.id}">
              <img src="${mob.imageUrl}" class="mob-card-img" />
              <div class="mob-card-name">${mob.nom}</div>
              <div class="mob-card-stats">
                <span>⚔️ ${mob.stats?.force || 5}</span>
                <span>⚡ ${mob.stats?.vitesse || 5}</span>
                <span>🛡️ ${mob.stats?.agilite || 5}</span>
              </div>
            </div>
          `).join('')}
        </div>

        <button id="btn-start-fight" class="fight-btn" disabled>FIGHT !</button>
      </div>
    `

        document.body.appendChild(this.selectionOverlay)
        console.log('[CombatUI] Selection overlay appended to body')

        // Events de sélection
        this.selectionOverlay.querySelectorAll('.mob-selection-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = (card as HTMLElement).dataset.id
                const mob = result.mobs!.find(m => m.id === id)
                if (!mob || mob.status === 'mort') return

                if (this.selectedFighters.includes(mob)) {
                    this.selectedFighters = this.selectedFighters.filter(f => f.id !== id)
                    card.classList.remove('selected')
                } else if (this.selectedFighters.length < 2) {
                    this.selectedFighters.push(mob)
                    card.classList.add('selected')
                }

                // Activer le bouton de combat
                const startBtn = document.getElementById('btn-start-fight') as HTMLButtonElement
                if (startBtn) {
                    startBtn.disabled = this.selectedFighters.length !== 2
                }
            })
        })

        // Bouton de lancement
        this.selectionOverlay.querySelector('#btn-start-fight')?.addEventListener('click', () => {
            if (this.selectedFighters.length === 2) {
                const [f1, f2] = this.selectedFighters
                this.destroySelection()
                onStartFight(f1, f2)
            }
        })

        // Bouton de fermeture
        this.selectionOverlay.querySelector('.close-btn')?.addEventListener('click', () => {
            this.destroySelection()
        })
    }

    /**
     * Lance la scène de combat visuelle
     */
    renderCombatScene(f1: MobData, f2: MobData, onFinish: (winner: MobData, loser: MobData) => void): void {
        this.currentFighter1 = f1
        this.currentFighter2 = f2

        // Calculate Max HP for each fighter
        const f1MaxHP = 100 + ((f1.stats?.vitalite || 0) * 5)
        const f2MaxHP = 100 + ((f2.stats?.vitalite || 0) * 5)

        // Calculate initial HP percentages
        const f1HpPercent = (f1.vie / f1MaxHP) * 100
        const f2HpPercent = (f2.vie / f2MaxHP) * 100

        this.combatOverlay = document.createElement('div')
        this.combatOverlay.id = 'combat-scene-overlay'
        this.combatOverlay.className = 'overlay active combat-scene'

        this.combatOverlay.innerHTML = `
      <div class="combat-arena">
        <div class="fighter-container left" id="fighter-${f1.id}">
            <div class="hud">
                <div class="name">${f1.nom}</div>
                <div class="hp-bar">
                    <div class="hp-fill" id="hp-${f1.id}" style="width: ${f1HpPercent}%"></div>
                    <div class="hp-text" id="hp-text-${f1.id}">${f1.vie}/${f1MaxHP}</div>
                </div>
                <div class="combat-stats">
                    <span class="stat">💪 ${f1.stats.force}</span>
                    <span class="stat">❤️ ${f1.stats.vitalite}</span>
                    <span class="stat">⚡ ${f1.stats.vitesse}</span>
                    <span class="stat">🎯 ${f1.stats.agilite}</span>
                </div>
                <div class="atb-bar"><div class="atb-fill" id="atb-${f1.id}" style="width: 0%"></div></div>
            </div>
            <div class="mob-wrapper">
                <img src="${f1.imageUrl}" class="combat-mob-img" />
                <div class="skin-layers">
                    <div class="layer bottom-layer ${f1.skin?.bottom || 'none'}"></div>
                    <div class="layer hat-layer ${f1.skin?.hat || 'none'}"></div>
                </div>
                <div class="maggot-companion">🪱</div>
            </div>
        </div>

        <div class="vs-label">VS</div>

        <div class="fighter-container right" id="fighter-${f2.id}">
            <div class="hud">
                <div class="name">${f2.nom}</div>
                <div class="hp-bar">
                    <div class="hp-fill" id="hp-${f2.id}" style="width: ${f2HpPercent}%"></div>
                    <div class="hp-text" id="hp-text-${f2.id}">${f2.vie}/${f2MaxHP}</div>
                </div>
                <div class="combat-stats">
                    <span class="stat">💪 ${f2.stats.force}</span>
                    <span class="stat">❤️ ${f2.stats.vitalite}</span>
                    <span class="stat">⚡ ${f2.stats.vitesse}</span>
                    <span class="stat">🎯 ${f2.stats.agilite}</span>
                </div>
                <div class="atb-bar"><div class="atb-fill" id="atb-${f2.id}" style="width: 0%"></div></div>
            </div>
            <div class="mob-wrapper">
                <img src="${f2.imageUrl}" class="combat-mob-img" />
                <div class="skin-layers">
                    <div class="layer bottom-layer ${f2.skin?.bottom || 'none'}"></div>
                    <div class="layer hat-layer ${f2.skin?.hat || 'none'}"></div>
                </div>
                <div class="maggot-companion">🪱</div>
            </div>
        </div>
        
        <div class="speed-controls">
            <button class="speed-btn active" data-speed="1">x1</button>
            <button class="speed-btn" data-speed="1.5">x1.5</button>
            <button class="speed-btn" data-speed="2">x2</button>
            <button class="speed-btn" data-speed="5">x5</button>
        </div>
        
        <div id="combat-log"></div>
      </div>
    `

        document.body.appendChild(this.combatOverlay)

        const engine = new CombatEngine(f1, f2, (event) => {
            this.handleCombatEvent(event)
        })

        // Gestion des boutons de vitesse
        this.combatOverlay.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target as HTMLElement
                const speed = parseFloat(target.dataset.speed || '1')

                // Update UI
                this.combatOverlay?.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'))
                target.classList.add('active')

                // Update Engine
                engine.setSpeed(speed)

                // Update CSS Variables for animations
                // Base animation duration is ~0.2s or 0.3s. 
                // We want to reduce it as speed increases.
                // 1 -> 0.2s
                // 2 -> 0.1s
                // 5 -> 0.04s
                const animDuration = Math.max(0.04, 0.2 / speed)
                document.documentElement.style.setProperty('--combat-speed', `${animDuration}s`)
            })
        })

        engine.start().then(({ winner, loser }) => {
            // Don't auto-close, show victory screen instead
            this.showVictoryScreen(winner, loser, onFinish)
        })
    }

    private handleCombatEvent(event: CombatEvent): void {
        if (!this.currentFighter1 || !this.currentFighter2) return

        switch (event.type) {
            case 'tick':
                this.updateBar(`atb-${this.currentFighter1.id}`, event.fighter1Energy)
                this.updateBar(`atb-${this.currentFighter2.id}`, event.fighter2Energy)
                break
            case 'attack':
                this.animateAttack(event.attackerId, event.targetId, event.damage, event.isCritical)
                this.updateHpUI(event.targetId, event.targetCurrentHp, event.targetMaxHp)
                break
            case 'dodge':
                // Add dodge animation to the mob image only, not the HUD
                const dodgingMobWrapper = document.querySelector(`#fighter-${event.targetId} .mob-wrapper`) as HTMLElement
                if (dodgingMobWrapper) {
                    dodgingMobWrapper.classList.add('dodging')
                    setTimeout(() => dodgingMobWrapper.classList.remove('dodging'), 500)
                }
                this.showPopup(event.targetId, 'ESQUIVE !', 'dodge')
                // Animer l'attaquant même si ça rate (pour la lisibilité)
                const dodgerAttacker = document.getElementById(`fighter-${event.attackerId}`)
                if (dodgerAttacker) {
                    dodgerAttacker.classList.add('attacking')
                    setTimeout(() => dodgerAttacker.classList.remove('attacking'), 300)
                }
                break
            case 'maggot_attack':
                this.showPopup(event.targetId, `🪱 -${event.damage}`, 'maggot')
                this.updateHpUI(event.targetId, event.targetCurrentHp, event.targetMaxHp)

                // Animation de l'asticot
                const attackerEl = document.getElementById(`fighter-${event.attackerId}`)
                const maggotEl = attackerEl?.querySelector('.maggot-companion')
                if (maggotEl) {
                    maggotEl.classList.add('attacking')
                    setTimeout(() => maggotEl.classList.remove('attacking'), 500)
                }
                break
            case 'log':
                const combatLog = document.getElementById('combat-log')
                if (combatLog) {
                    const p = document.createElement('p')
                    p.textContent = event.message
                    combatLog.appendChild(p)
                    combatLog.scrollTop = combatLog.scrollHeight // Scroll to bottom
                }
                break
            case 'death':
                // Calculate MaxHP for the dead fighter
                const deadFighterData = this.currentFighter1?.id === event.deadId ? this.currentFighter1 : this.currentFighter2
                const deadMaxHP = deadFighterData ? 100 + ((deadFighterData.stats?.vitalite || 0) * 5) : 100
                this.updateHpUI(event.deadId, 0, deadMaxHP)
                const deadFighter = document.getElementById(`fighter-${event.deadId}`)
                if (deadFighter) {
                    deadFighter.classList.add('dead')
                }
                break
        }
    }

    private updateBar(id: string, value: number): void {
        const bar = document.getElementById(id)
        if (bar) bar.style.width = `${Math.max(0, Math.min(100, value))}%`
    }

    private updateHpUI(id: string, current: number, max: number): void {
        const bar = document.getElementById(`hp-${id}`)
        const text = document.getElementById(`hp-text-${id}`)

        const percentage = (current / max) * 100
        if (bar) bar.style.width = `${Math.max(0, Math.min(100, percentage))}%`
        if (text) text.textContent = `${Math.max(0, current)}/${max}`
    }

    private animateAttack(attackerId: string, targetId: string, damage: number, crit: boolean): void {
        // Apply animations to mob-wrapper only, not the entire fighter container
        const attackerWrapper = document.querySelector(`#fighter-${attackerId} .mob-wrapper`) as HTMLElement
        const targetWrapper = document.querySelector(`#fighter-${targetId} .mob-wrapper`) as HTMLElement

        if (attackerWrapper && targetWrapper) {
            attackerWrapper.classList.add('attacking')
            setTimeout(() => attackerWrapper.classList.remove('attacking'), 300)

            targetWrapper.classList.add('hit')
            setTimeout(() => targetWrapper.classList.remove('hit'), 300)

            this.showPopup(targetId, `-${damage}${crit ? ' CRIT!' : ''}`, crit ? 'crit' : 'damage')
        }
    }

    private showPopup(targetId: string, text: string, type: string): void {
        const target = document.getElementById(`fighter-${targetId}`)
        if (!target) return

        const popup = document.createElement('div')
        popup.className = `combat-popup ${type}`
        popup.textContent = text
        target.appendChild(popup)

        setTimeout(() => popup.remove(), 1000)
    }

    destroySelection(): void {
        if (this.selectionOverlay) {
            this.selectionOverlay.remove()
            this.selectionOverlay = null
        }
    }

    destroyCombat(): void {
        if (this.combatOverlay) {
            this.combatOverlay.remove()
            this.combatOverlay = null
        }
    }

    private async showVictoryScreen(winner: any, loser: any, onFinish: (winner: any, loser: any) => void): Promise<void> {
        const victoryOverlay = document.createElement('div')
        victoryOverlay.className = 'victory-overlay'
        victoryOverlay.innerHTML = `
            <div class="victory-content">
                <h1 class="victory-title">VICTOIRE!</h1>
                <div class="victor-name">${winner.nom}</div>
                <div class="combat-results">
                    <div>🏆 Vainqueur: ${winner.nom}</div>
                    <div>💀 Vaincu: ${loser.nom}</div>
                </div>
                <button class="continue-btn" id="continue-combat-btn">Continuer →</button>
            </div>
        `
        this.combatOverlay?.appendChild(victoryOverlay)

        const continueBtn = document.getElementById('continue-combat-btn')
        await new Promise<void>(resolve => {
            continueBtn?.addEventListener('click', () => {
                victoryOverlay.remove()
                resolve()
            })
        })

        // Check for level-ups
        await this.handleLevelUps([winner, loser])

        this.destroyCombat()
        onFinish(winner, loser)
    }

    private async handleLevelUps(mobs: any[]): Promise<void> {
        for (const mob of mobs) {
            const mobData = await window.api.getMobById(mob.id)
            if (!mobData.success || !mobData.mob) continue

            const freshMob = mobData.mob
            if (freshMob.statPoints > 0) {
                await this.showLevelUpChoices(freshMob)
            }
        }
    }

    private async showLevelUpChoices(mob: any): Promise<void> {
        const choicesResult = await window.api.getUpgradeChoices(mob.id)
        if (!choicesResult.success || !choicesResult.choices) return

        const levelUpOverlay = document.createElement('div')
        levelUpOverlay.className = 'levelup-overlay'
        levelUpOverlay.innerHTML = `
            <div class="levelup-content">
                <h2 class="levelup-title">${mob.nom} - Niveau ${mob.level}!</h2>
                <p class="levelup-subtitle">Choisissez une amélioration:</p>
                <div class="upgrade-choices" id="upgrade-choices"></div>
            </div>
        `
        this.combatOverlay?.appendChild(levelUpOverlay)

        const choicesContainer = levelUpOverlay.querySelector('#upgrade-choices') as HTMLElement

        const choicePromise = new Promise<any>(resolve => {
            choicesResult.choices?.forEach(choice => {
                const card = document.createElement('div')
                card.className = 'upgrade-card'
                const descText = choice.type === 'trait' ? choice.description || '' : ''
                card.innerHTML = `
                    <div class="upgrade-icon">${this.getUpgradeIcon(choice)}</div>
                    <div class="upgrade-label">${choice.label}</div>
                    ${descText ? `<div class="upgrade-desc">${descText}</div>` : ''}
                `
                card.addEventListener('click', () => resolve(choice))
                choicesContainer.appendChild(card)
            })
        })

        const selectedChoice = await choicePromise
        await window.api.applyUpgrade(mob.id, selectedChoice)
        levelUpOverlay.remove()
    }

    private getUpgradeIcon(choice: any): string {
        if (choice.type === 'stat') return '📈'
        if (choice.type === 'weapon') return '⚔️'
        if (choice.type === 'trait') return '✨'
        return '🎁'
    }
}
