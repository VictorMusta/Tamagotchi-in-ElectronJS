import { MobData } from '../../../shared/types'
import { CombatEngine, CombatEvent } from './CombatEngine'
import { WEAPON_REGISTRY } from '../../../shared/WeaponRegistry'

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
                <div class="weapon-stock" id="stock-${f1.id}">
                    ${(f1.weapons || []).map(w => {
                        const icon = WEAPON_REGISTRY[w]?.icon || 'default.png'
                        return `<div class="stock-icon" style="background-image: url('assets/weapons/${icon}')" title="${w}"></div>`
                    }).join('')}
                </div>
                <div class="atb-bar"><div class="atb-fill" id="atb-${f1.id}" style="width: 0%"></div></div>
            </div>
            <div class="mob-wrapper">
                <img src="${f1.imageUrl}" class="combat-mob-img" />
                <div class="skin-layers">
                    <div class="layer hat-layer ${f1.skin?.hat || 'none'}"></div>
                </div>
                ${f1.traits.includes("Appel de l'Astico-Roi") ? `
                <div class="maggot-companion">🪱</div>
                <div class="maggot-bar"><div class="maggot-fill" id="maggot-${f1.id}" style="width: 0%"></div></div>
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
                <img src="${f2.imageUrl}" class="combat-mob-img" />
                <div class="skin-layers">
                    <div class="layer hat-layer ${f2.skin?.hat || 'none'}"></div>
                </div>
                ${f2.traits.includes("Appel de l'Astico-Roi") ? `
                <div class="maggot-companion">🪱</div>
                <div class="maggot-bar"><div class="maggot-fill" id="maggot-${f2.id}" style="width: 0%"></div></div>
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
                if (event.maggot1Energy !== undefined) this.updateBar(`maggot-${this.currentFighter1.id}`, event.maggot1Energy)
                if (event.maggot2Energy !== undefined) this.updateBar(`maggot-${this.currentFighter2.id}`, event.maggot2Energy)
                break
            case 'attack':
                this.animateAttack(event.attackerId, event.targetId, event.damage, event.isCritical, event.weapon)
                this.updateHpUI(event.targetId, event.targetCurrentHp, event.targetMaxHp)
                break
            case 'dodge':
                // Dash animation for the attacker even if it's dodged
                const dodgeAttacker = document.getElementById(`fighter-${event.attackerId}`)
                const dodgeTarget = document.querySelector(`#fighter-${event.targetId} .mob-wrapper`) as HTMLElement
                if (dodgeAttacker && dodgeTarget) {
                    this.performDash(dodgeAttacker, dodgeTarget)
                }

                // Dodging animation for the target
                const dodgingMobWrapper = document.querySelector(`#fighter-${event.targetId} .mob-wrapper`) as HTMLElement
                if (dodgingMobWrapper) {
                    dodgingMobWrapper.classList.add('dodging')
                    setTimeout(() => dodgingMobWrapper.classList.remove('dodging'), 500)
                }
                this.showPopup(event.targetId, 'ESQUIVE !', 'dodge')
                break
            case 'maggot_attack':
                const attackerContainer = document.getElementById(`fighter-${event.attackerId}`)
                const targetWrapper = document.querySelector(`#fighter-${event.targetId} .mob-wrapper`) as HTMLElement
                const maggotEl = attackerContainer?.querySelector('.maggot-companion') as HTMLElement

                if (maggotEl && targetWrapper) {
                    this.performDash(maggotEl, targetWrapper)
                }

                this.showPopup(event.targetId, `🪱 -${event.damage}`, 'maggot')
                this.updateHpUI(event.targetId, event.targetCurrentHp, event.targetMaxHp)
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
                this.animateAttack(event.attackerId, event.targetId, event.damage, false, event.weapon)
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
                                <img src="./assets/weapons/${WEAPON_REGISTRY[event.weapon]?.icon || 'toothpick.png'}" class="weapon-icon" />
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

    private animateAttack(attackerId: string, targetId: string, damage: number, crit: boolean, weaponName?: string): void {
        const attackerContainer = document.getElementById(`fighter-${attackerId}`)
        const targetContainer = document.getElementById(`fighter-${targetId}`)
        const attackerWrapper = attackerContainer?.querySelector('.mob-wrapper') as HTMLElement
        const targetWrapper = targetContainer?.querySelector('.mob-wrapper') as HTMLElement
        const weaponEl = attackerWrapper?.querySelector('.weapon-container') as HTMLElement

        // WEAPON ANIMATION
        if (weaponEl) {
            // Find weapon type based on what is currently rendered (we can infer from engine or check registry if we had the mob data handy)
            // But we don't have easy access to the exact weapon instance here easily without looking up mob data.
            // However, we can check the ID of the weapon image or just pass it in event? 
            // Better: Perform a quick lookup via registry if we can get the weapon name. 
            // Or simpler: Pass weapon name in the event!
            // The event 'attack' has `weapon?: string`. PERFECT.
            
            // Wait, I need to check if event has weapon name. 
            // Looking at files, CombatEvent for attack has: weapon?: string.
            
            // Let's retrieve the animation type.
            // We need to access the event data in this function, or pass it.
            // The signature is animateAttack(attackerId, targetId, damage, crit).
            // I should update signature or just do a best guess if not passed? 
            // Wait, I am editing the function right now. I can just change the signature or use a global lookup?
            // Actually I should update the method signature in the class to accept weaponName.
        }

        if (attackerContainer && targetContainer && attackerWrapper && targetWrapper) {
            this.performDash(attackerContainer, targetWrapper)

            // Trigger Weapon specific animation
            if (weaponEl) {
                 // Try to deduce animation from the weapon currently in DOM? 
                 // Or we rely on the fact that `animateAttack` should theoretically know the weapon.
                 // Let's modify the signature in a subsequent step if needed, but for now let's just use a generic 'swing' if we can't find it,
                 // OR BETTER: Use the MobData references `this.currentFighter1/2` to find what weapon they have!
                 
                 // let weaponName: string | undefined
                 // if (attackerId === this.currentFighter1?.id) weaponName = this.currentFighter1.weapon
                 // else if (attackerId === this.currentFighter2?.id) weaponName = this.currentFighter2.weapon
                 
                 if (weaponName) {
                     const def = WEAPON_REGISTRY[weaponName]
                     const animType = def?.animationType || 'slash' // Default to slash
                     
                     weaponEl.classList.add(`anim-${animType}`)
                     setTimeout(() => weaponEl.classList.remove(`anim-${animType}`), 500)
                 }
            }

            targetWrapper.classList.add('hit')
            setTimeout(() => targetWrapper.classList.remove('hit'), 300)

            this.showPopup(targetId, `-${damage}${crit ? ' CRIT!' : ''}`, crit ? 'crit' : 'damage')
        }
    }

    /**
     * Centralized dash animation logic
     */
    private performDash(attacker: HTMLElement, target: HTMLElement): void {
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

        setTimeout(() => {
            attacker.classList.remove('dash-attacking')
        }, 700)
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

        // 1. Process Results (XP / Rewards)
        try {
            const result = await window.api.processCombatResult(winner, loser)
            console.log('[CombatUI] Combat processed:', result)
            
            // Show reward if any
            if (result.reward) {
                 // TODO: Better reward UI
                 alert(`Récompense obtenue: ${result.reward}`)
            }

            // Update local references to use the fresh data (stats, level, etc)
            // But handleLevelUps re-fetches anyway.
        } catch (e) {
            console.error('[CombatUI] Error processing combat result:', e)
        }

        // 2. Check for level-ups (Now that XP is added)
        try {
            await this.handleLevelUps([winner, loser])
        } catch (e) {
            console.error('[CombatUI] Error during level-ups:', e)
        }

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
        try {
            const choicesResult = await window.api.getMobUpgradeChoices(mob.id)
            if (!choicesResult.success || !choicesResult.choices || choicesResult.choices.length === 0) {
                console.log('[CombatUI] No upgrade choices available for', mob.nom)
                return
            }

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
            await window.api.applyMobUpgrade(mob.id, selectedChoice)
            levelUpOverlay.remove()
        } catch (error) {
            console.error('[CombatUI] Error in showLevelUpChoices:', error)
        }
    }

    private getUpgradeIcon(choice: any): string {
        if (choice.type === 'stat') return '📈'
        if (choice.type === 'weapon') return '⚔️'
        if (choice.type === 'trait') return '✨'
        return '🎁'
    }
}
