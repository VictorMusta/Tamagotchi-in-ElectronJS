import { MobData } from '../../../shared/types'
import { CombatEngine, CombatEvent } from './CombatEngine'
import { WEAPON_REGISTRY } from '../../../shared/WeaponRegistry'

export class CombatUI {
    private selectionOverlay: HTMLElement | null = null
    private combatOverlay: HTMLElement | null = null
    private selectedFighters: MobData[] = []
    private currentFighter1: MobData | null = null
    private currentFighter2: MobData | null = null
    private currentSpeed: number = 1
    private eventQueue: CombatEvent[] = []
    private isProcessingQueue: boolean = false

    constructor() {
        this.loadSpeed()
    }

    private loadSpeed(): void {
        const savedSpeed = localStorage.getItem('combat-speed')
        if (savedSpeed) {
            this.currentSpeed = parseFloat(savedSpeed)
        }
    }

    private saveSpeed(speed: number): void {
        this.currentSpeed = speed
        localStorage.setItem('combat-speed', speed.toString())
    }

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
            console.warn('[CombatUI] No mobs available for selection!')
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
        const f1MaxHP = 100 + ((f1.stats?.vitalite || 0) * 10)
        const f2MaxHP = 100 + ((f2.stats?.vitalite || 0) * 10)

        // Calculate initial HP percentages
        const f1HpPercent = (f1.vie / f1MaxHP) * 100

        // Default potato image for enemies without imageUrl
        const defaultImage = 'assets/Potato still.png'
        const f1Image = f1.imageUrl || defaultImage
        const f2Image = f2.imageUrl || defaultImage
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
                <div class="weapon-stock" id="stock-${f1.id}">
                    ${(f1.weapons || []).map(w => {
            const icon = WEAPON_REGISTRY[w]?.icon || 'default.png'
            return `<div class="stock-icon" style="background-image: url('assets/weapons/${icon}')" title="${w}"></div>`
        }).join('')}
                </div>
                <div class="atb-bar"><div class="atb-fill" id="atb-${f1.id}" style="width: 0%"></div></div>
            </div>
            <div class="mob-wrapper">
                <img src="${f1Image}" class="combat-mob-img" />
                <div class="skin-layers">
                    <div class="layer hat-layer ${f1.skin?.hat || 'none'}"></div>
                </div>
                ${f1.traits.includes("Appel de l'Astico-Roi") ? `
                <div class="maggot-companion">🪱</div>
                <div class="maggot-bar"><div class="maggot-fill" id="maggot-${f1.id}" style="width: 0%"></div></div>
                ` : ''}
                ${f1.traits.includes("Essaim de Moucherons") ? `
                <div class="maggot-companion essaim">🦟</div>
                <div class="maggot-bar"><div class="maggot-fill" id="essaim-${f1.id}" style="width: 0%"></div></div>
                ` : ''}
                ${f1.traits.includes("Gardien de Racine") ? `
                <div class="maggot-companion gardien">🛡️</div>
                <div class="guardian-hp" id="guardian-hp-${f1.id}">${Math.floor((100 + f1.stats.vitalite * 10) * 0.5)} HP</div>
                ` : ''}
                ${f1.traits.includes("Esprit Saboteur") ? `
                <div class="maggot-companion esprit">👻</div>
                <div class="maggot-bar"><div class="maggot-fill" id="spirit-${f1.id}" style="width: 0%"></div></div>
                ` : ''}
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
                <div class="weapon-stock" id="stock-${f2.id}">
                    ${(f2.weapons || []).map(w => {
            const icon = WEAPON_REGISTRY[w]?.icon || 'default.png'
            return `<div class="stock-icon" style="background-image: url('assets/weapons/${icon}')" title="${w}"></div>`
        }).join('')}
                </div>
                <div class="atb-bar"><div class="atb-fill" id="atb-${f2.id}" style="width: 0%"></div></div>
            </div>
            <div class="mob-wrapper">
                <img src="${f2Image}" class="combat-mob-img" />
                <div class="skin-layers">
                    <div class="layer hat-layer ${f2.skin?.hat || 'none'}"></div>
                </div>
                ${f2.traits.includes("Appel de l'Astico-Roi") ? `
                <div class="maggot-companion">🪱</div>
                <div class="maggot-bar"><div class="maggot-fill" id="maggot-${f2.id}" style="width: 0%"></div></div>
                ` : ''}
                ${f2.traits.includes("Essaim de Moucherons") ? `
                <div class="maggot-companion essaim">🦟</div>
                <div class="maggot-bar"><div class="maggot-fill" id="essaim-${f2.id}" style="width: 0%"></div></div>
                ` : ''}
                ${f2.traits.includes("Gardien de Racine") ? `
                <div class="maggot-companion gardien">🛡️</div>
                <div class="guardian-hp" id="guardian-hp-${f2.id}">${Math.floor((100 + f2.stats.vitalite * 10) * 0.5)} HP</div>
                ` : ''}
                ${f2.traits.includes("Esprit Saboteur") ? `
                <div class="maggot-companion esprit">👻</div>
                <div class="maggot-bar"><div class="maggot-fill" id="spirit-${f2.id}" style="width: 0%"></div></div>
                ` : ''}
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

        // Initialiser l'engine avec la vitesse persistée
        const engine = new CombatEngine(f1, f2, (event) => {
            this.handleCombatEvent(event)
        })
        engine.setSpeed(this.currentSpeed)

        // Mettre à jour les boutons UI selon la vitesse persistée
        this.combatOverlay.querySelectorAll('.speed-btn').forEach(btn => {
            const btnSpeed = parseFloat((btn as HTMLElement).dataset.speed || '1')
            if (btnSpeed === this.currentSpeed) {
                btn.classList.add('active')
            } else {
                btn.classList.remove('active')
            }

            btn.addEventListener('click', (e) => {
                const target = e.target as HTMLElement
                const speed = parseFloat(target.dataset.speed || '1')

                // Sauvegarder la nouvelle vitesse
                this.saveSpeed(speed)

                // Update UI
                this.combatOverlay?.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'))
                target.classList.add('active')

                // Update Engine
                engine.setSpeed(speed)

                // Update CSS Variables for animations
                const animDuration = Math.max(0.1, 0.4 / speed)
                document.documentElement.style.setProperty('--combat-speed', `${animDuration}s`)
            })
        })

        // Appliquer la variable CSS initiale
        const initialAnimDuration = Math.max(0.1, 0.4 / this.currentSpeed)
        document.documentElement.style.setProperty('--combat-speed', `${initialAnimDuration}s`)

        engine.start().then(async ({ winner, loser }) => {
            // Wait for all animations in the queue to finish before showing victory
            await this.waitForQueue()
            this.showVictoryScreen(winner, loser, onFinish)
        })
    }

    private async waitForQueue(): Promise<void> {
        // Wait as long as the queue is being processed or has items
        while (this.isProcessingQueue || this.eventQueue.length > 0) {
            await new Promise(r => setTimeout(r, 50))
        }
        // Small extra delay for the last animation to settle
        await new Promise(r => setTimeout(r, 300 / this.currentSpeed))
    }

    private handleCombatEvent(event: CombatEvent): void {
        this.eventQueue.push(event)
        this.processQueue()
    }

    private async processQueue(): Promise<void> {
        if (this.isProcessingQueue || this.eventQueue.length === 0) return
        this.isProcessingQueue = true

        while (this.eventQueue.length > 0) {
            const event = this.eventQueue.shift()!
            await this.executeEvent(event)
        }

        this.isProcessingQueue = false
    }

    private async executeEvent(event: CombatEvent): Promise<void> {
        if (!this.currentFighter1 || !this.currentFighter2) return

        switch (event.type) {
            case 'tick':
                this.updateBar(`atb-${this.currentFighter1.id}`, event.fighter1Energy)
                this.updateBar(`atb-${this.currentFighter2.id}`, event.fighter2Energy)
                if (event.maggot1Energy !== undefined) this.updateBar(`maggot-${this.currentFighter1.id}`, event.maggot1Energy)
                if (event.maggot2Energy !== undefined) this.updateBar(`maggot-${this.currentFighter2.id}`, event.maggot2Energy)
                if (event.essaim1Energy !== undefined) this.updateBar(`essaim-${this.currentFighter1.id}`, event.essaim1Energy)
                if (event.essaim2Energy !== undefined) this.updateBar(`essaim-${this.currentFighter2.id}`, event.essaim2Energy)
                if (event.spirit1Energy !== undefined) this.updateBar(`spirit-${this.currentFighter1.id}`, event.spirit1Energy)
                if (event.spirit2Energy !== undefined) this.updateBar(`spirit-${this.currentFighter2.id}`, event.spirit2Energy)
                break
            case 'attack':
                await this.animateAttack(event.attackerId, event.targetId, event.damage, event.isCritical, event.weapon)
                this.updateHpUI(event.targetId, event.targetCurrentHp, event.targetMaxHp)
                break
            case 'dodge':
                // Dash animation for the attacker even if it's dodged
                const dodgeAttacker = document.getElementById(`fighter-${event.attackerId}`)
                const dodgeTarget = document.querySelector(`#fighter-${event.targetId} .mob-wrapper`) as HTMLElement
                if (dodgeAttacker && dodgeTarget) {
                    await this.performDash(dodgeAttacker, dodgeTarget)
                }

                // Dodging animation for the target
                const dodgingMobWrapper = document.querySelector(`#fighter-${event.targetId} .mob-wrapper`) as HTMLElement
                if (dodgingMobWrapper) {
                    dodgingMobWrapper.classList.add('dodging')
                    await new Promise(r => setTimeout(r, 500 / this.currentSpeed))
                    dodgingMobWrapper.classList.remove('dodging')
                }
                this.showPopup(event.targetId, 'ESQUIVE !', 'dodge')
                break
            case 'maggot_attack':
                const attackerContainer = document.getElementById(`fighter-${event.attackerId}`)
                const targetWrapper = document.querySelector(`#fighter-${event.targetId} .mob-wrapper`) as HTMLElement
                const maggotEl = attackerContainer?.querySelector('.maggot-companion:not(.essaim):not(.esprit):not(.gardien)') as HTMLElement

                if (maggotEl && targetWrapper) {
                    await this.performDash(maggotEl, targetWrapper)
                }

                this.showPopup(event.targetId, `🪱 -${event.damage}`, 'maggot')
                this.updateHpUI(event.targetId, event.targetCurrentHp, event.targetMaxHp)
                break
            case 'essaim_attack':
                const essaimAttacker = document.getElementById(`fighter-${event.attackerId}`)
                const essaimTarget = document.querySelector(`#fighter-${event.targetId} .mob-wrapper`) as HTMLElement
                const essaimEl = essaimAttacker?.querySelector('.essaim') as HTMLElement

                if (essaimEl && essaimTarget) {
                    await this.performDash(essaimEl, essaimTarget)
                }

                this.showPopup(event.targetId, `🦟 -${event.damage}${event.blinded ? ' 🎯' : ''}`, 'maggot')
                this.updateHpUI(event.targetId, event.targetCurrentHp, event.targetMaxHp)
                if (event.blinded) this.showPopup(event.targetId, 'AVEUGLE !', 'dodge')
                break
            case 'spirit_action':
                const spiritAttacker = document.getElementById(`fighter-${event.attackerId}`)
                const spiritTarget = document.querySelector(`#fighter-${event.targetId} .mob-wrapper`) as HTMLElement
                const spiritEl = spiritAttacker?.querySelector('.esprit') as HTMLElement

                if (spiritEl && spiritTarget) {
                    await this.performDash(spiritEl, spiritTarget)
                }

                if (event.action !== 'miss') {
                    this.showPopup(event.targetId, event.action === 'swap' ? 'SWAP !' : 'DROP !', 'sabotage')
                } else {
                    this.showPopup(event.attackerId, 'PROUT', 'miss')
                }
                break
            case 'guardian_absorb':
                this.updateGuardianHp(event.ownerId, event.guardianHp)
                this.showPopup(event.ownerId, `🛡️ -${event.damageAbsorbed}`, 'dodge')
                break
            case 'log':
                const combatLog = document.getElementById('combat-log')
                if (combatLog) {
                    const p = document.createElement('p')
                    p.textContent = event.message
                    combatLog.appendChild(p)
                    combatLog.scrollTop = combatLog.scrollHeight // Scroll to bottom
                }

                // Visual Block Feedback
                if (event.message.includes('BLOQUE')) {
                    // Try to find who blocked. Message format: "${defender.nom} BLOQUE..."
                    // A bit hacky but works for visual flair
                    const name = event.message.split(' BLOQUE')[0]
                    const f1 = this.currentFighter1?.nom === name ? this.currentFighter1 : null
                    const f2 = this.currentFighter2?.nom === name ? this.currentFighter2 : null
                    const blocker = f1 || f2

                    if (blocker) {
                        const blockerEl = document.getElementById(`fighter-${blocker.id}`)
                        const weaponEl = blockerEl?.querySelector('.weapon-container') as HTMLElement
                        if (weaponEl) {
                            weaponEl.classList.add('anim-block')
                            setTimeout(() => weaponEl.classList.remove('anim-block'), 500)
                        }
                    }
                }
                break
            case 'counter_attack':
                await this.animateAttack(event.attackerId, event.targetId, event.damage, false, event.weapon)
                this.updateHpUI(event.targetId, event.targetCurrentHp, event.targetMaxHp)
                this.showPopup(event.attackerId, 'CONTRE !', 'counter')
                break
            case 'inventory_change':
                const stockEl = document.getElementById(`stock-${event.id}`)
                if (stockEl) {
                    stockEl.innerHTML = event.inventory.map(w => {
                        const icon = WEAPON_REGISTRY[w]?.icon || 'default.png'
                        return `<div class="stock-icon" style="background-image: url('assets/weapons/${icon}')" title="${w}"></div>`
                    }).join('')
                }
                break
            case 'weapon_steal':
                this.showPopup(event.thiefId, `VOL D'ARME: ${event.weapon} !`, 'steal')
                break
            case 'weapon_change':
                const fighterContainer = document.getElementById(`fighter-${event.id}`)
                const mobWrapper = fighterContainer?.querySelector('.mob-wrapper')

                if (mobWrapper) {
                    // Remove existing pivot
                    const existingPivot = mobWrapper.querySelector('.weapon-pivot')
                    if (existingPivot) existingPivot.remove()

                    // Add new one if weapon exists
                    if (event.weapon) {
                        const pivot = document.createElement('div')
                        pivot.className = 'weapon-pivot'
                        pivot.innerHTML = `
                            <div class="weapon-container">
                                <img src="assets/weapons/${WEAPON_REGISTRY[event.weapon]?.icon || 'toothpick.png'}" class="weapon-icon" />
                            </div>
                        `
                        mobWrapper.appendChild(pivot)
                    }
                }
                break
            case 'state_change':
                if (event.state === 'berzerk' && event.value) {
                    const el = document.getElementById(`fighter-${event.id}`)
                    el?.classList.add('berzerk-mode')
                    this.showPopup(event.id, 'BERZERK !!!', 'berzerk-text')
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
                    deadFighter.classList.remove('berzerk-mode')
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

    private async animateAttack(attackerId: string, targetId: string, damage: number, crit: boolean, weaponName?: string, isCompanion: boolean = false): Promise<void> {
        const attackerContainer = document.getElementById(`fighter-${attackerId}`)
        const targetContainer = document.getElementById(`fighter-${targetId}`)
        const attackerWrapper = attackerContainer?.querySelector('.mob-wrapper') as HTMLElement
        const targetWrapper = targetContainer?.querySelector('.mob-wrapper') as HTMLElement
        const weaponEl = attackerWrapper?.querySelector('.weapon-container') as HTMLElement

        if (attackerContainer && targetContainer && attackerWrapper && targetWrapper) {
            await this.performDash(isCompanion ? (attackerContainer.querySelector('.maggot-companion') as HTMLElement || attackerContainer) : attackerContainer, targetWrapper)

            // Trigger Weapon specific animation
            if (weaponEl) {
                if (weaponName) {
                    const def = WEAPON_REGISTRY[weaponName]
                    const animType = def?.animationType || 'slash' // Default to slash

                    weaponEl.classList.add(`anim-${animType}`)
                    await new Promise(r => setTimeout(r, 500 / this.currentSpeed))
                    weaponEl.classList.remove(`anim-${animType}`)
                }
            }

            targetWrapper.classList.add('hit')
            this.showPopup(targetId, `-${damage}${crit ? ' CRIT!' : ''}`, crit ? 'crit' : 'damage')
            await new Promise(r => setTimeout(r, 300 / this.currentSpeed))
            targetWrapper.classList.remove('hit')
        }
    }

    /**
     * Centralized dash animation logic
     */
    private async performDash(attacker: HTMLElement, target: HTMLElement): Promise<void> {
        // Calculate distance for responsive dash
        const attackerRect = attacker.getBoundingClientRect()
        const targetRect = target.getBoundingClientRect()

        const deltaX = targetRect.left - attackerRect.left
        const deltaY = targetRect.top - attackerRect.top

        // Set CSS variables for the animation
        attacker.style.setProperty('--dash-x', `${deltaX}px`)
        attacker.style.setProperty('--dash-y', `${deltaY}px`)

        attacker.classList.remove('dash-attacking')
        void attacker.offsetWidth // Force reflow
        attacker.classList.add('dash-attacking')

        await new Promise(r => setTimeout(r, 700 / this.currentSpeed))
        attacker.classList.remove('dash-attacking')
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
            continueBtn?.addEventListener('click', async () => {
                victoryOverlay.remove()

                // 1. Process Results (XP / Rewards)
                try {
                    const combatResult = await (window.api as any).processCombatResult(winner, loser)
                    console.log('[CombatUI] Combat processed:', combatResult)
                    if (combatResult.reward) {
                        alert(`Récompense obtenue: ${combatResult.reward}`)
                    }
                } catch (e) {
                    console.error('[CombatUI] Error processing combat result:', e)
                }

                // 2. Handle level ups before finishing
                const result = await (window.api as any).getAllMobs()
                const mobsArr = result.mobs || []
                const f1 = mobsArr.find((m: MobData) => m.id === this.currentFighter1?.id)
                const f2 = mobsArr.find((m: MobData) => m.id === this.currentFighter2?.id)
                const mobsToCheck = [f1, f2].filter(Boolean) as MobData[]

                await this.handleLevelUps(mobsToCheck)

                this.destroyCombat()
                onFinish(winner, loser)
                resolve()
            })
        })
    }

    private async handleLevelUps(mobs: MobData[]): Promise<void> {
        for (const mob of mobs) {
            let freshMob = mob
            // Standardizing level up check based on MobData interface
            while (freshMob.experience >= (freshMob.level * 100)) {
                // Trigger level up and wait for choice
                await this.showLevelUpChoices(freshMob)
                // Refresh mob data after choice
                const result = await (window.api as any).getAllMobs()
                if (result.success && result.mobs) {
                    const updated = result.mobs.find((m: MobData) => m.id === mob.id)
                    if (updated) freshMob = updated
                    else break
                } else {
                    break
                }
            }
        }
    }

    private async showLevelUpChoices(mob: MobData): Promise<void> {
        return new Promise(async (resolve) => {
            const result = await (window.api as any).getMobUpgradeChoices(mob.id)
            if (!result || !result.success || !result.choices) {
                resolve()
                return
            }

            const { choices } = result
            const overlay = document.createElement('div')
            overlay.className = 'level-up-overlay'
            overlay.innerHTML = `
                <div class="level-up-content">
                    <h2>NIVEAU SUPÉRIEUR !</h2>
                    <p>${mob.nom} passe au niveau ${mob.level + 1}</p>
                    <div class="choices-container">
                        ${choices.map((c: any, i: number) => `
                            <div class="choice-card" data-index="${i}">
                                <div class="choice-icon">${this.getUpgradeIcon(c.type)}</div>
                                <div class="choice-name">${c.name}</div>
                                <div class="choice-desc">${c.description}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `
            document.body.appendChild(overlay)

            overlay.querySelectorAll('.choice-card').forEach(card => {
                card.addEventListener('click', async () => {
                    const index = parseInt((card as HTMLElement).dataset.index!)
                    await (window.api as any).applyMobUpgrade(mob.id, choices[index])
                    overlay.remove()
                    resolve()
                })
            })
        })
    }

    private getUpgradeIcon(type: string): string {
        switch (type) {
            case 'stat': return '📈'
            case 'weapon': return '⚔️'
            case 'trait': return '✨'
            default: return '❓'
        }
    }

    private updateGuardianHp(ownerId: string, current: number): void {
        const text = document.getElementById(`guardian-hp-${ownerId}`)
        if (text) {
            text.innerText = `${Math.max(0, Math.floor(current))} HP`
            if (current <= 0) {
                text.style.opacity = '0.3'
                const companion = text.parentElement?.querySelector('.gardien') as HTMLElement
                if (companion) companion.style.opacity = '0.3'
            }
        }
    }
}
