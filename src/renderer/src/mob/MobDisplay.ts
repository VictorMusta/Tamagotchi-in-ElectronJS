import { MobData } from '../../../shared/types'
import { WEAPON_REGISTRY } from '../../../shared/WeaponRegistry'

export class MobDisplay {
    public element: HTMLElement
    private tooltip: HTMLElement | null = null
    private isTrackingTooltip: boolean = false
    private rafId: number | null = null
    private currentData: MobData // NEW: Store current data

    // Elements
    public mobInner: HTMLElement
    private nameElement: HTMLElement

    constructor(data: MobData) {
        this.currentData = data // Init
        this.element = document.createElement('div')
        this.element.className = 'mob'
        this.element.id = `mob-${data.id}`

        // Create inner container (THIS WILL ROTATE)
        this.mobInner = document.createElement('div')
        this.mobInner.className = 'mob-inner-rotating'
        this.mobInner.style.width = '100%'
        this.mobInner.style.height = '100%'
        this.mobInner.style.position = 'absolute'
        this.mobInner.style.top = '0'
        this.mobInner.style.left = '0'
        this.mobInner.style.display = 'flex'
        this.mobInner.style.alignItems = 'center'
        this.mobInner.style.justifyContent = 'center'

        // Create Name Element (STATIONARY)
        this.nameElement = document.createElement('div')
        this.nameElement.className = 'mob-name'
        this.nameElement.style.position = 'absolute'
        this.nameElement.style.top = '-25px'
        this.nameElement.style.left = '50%'
        this.nameElement.style.transform = 'translateX(-50%)'
        this.nameElement.style.zIndex = '140'
        this.nameElement.style.pointerEvents = 'auto'
        this.nameElement.style.cursor = 'pointer'

        this.element.appendChild(this.mobInner)
        this.element.appendChild(this.nameElement)

        this.update(data)

        // Tooltip Listeners (On the mob visual, not the name necessarily)
        // CRITICAL FIX: Use this.currentData instead of closure 'data'
        this.mobInner.addEventListener('mouseenter', () => this.showTooltip(this.currentData))
        this.mobInner.addEventListener('mouseleave', () => this.hideTooltip())
    }

    /**
     * Initializes the display in the DOM and sets up callbacks
     */
    render(
        container: HTMLElement,
        onSelect: () => void,
        onAction: (nameEl: HTMLElement) => void
    ): HTMLElement {
        // Append to container
        container.appendChild(this.element)

        // Setup interaction events
        this.element.addEventListener('click', (e) => {
            e.stopPropagation()
            onSelect()
        })

        // Action Trigger (Profile / Rename)
        // Check if double click on mob OR click on name
        this.element.addEventListener('dblclick', (e) => {
            e.preventDefault()
            e.stopPropagation()
            onAction(this.nameElement)
        })

        this.nameElement.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            onAction(this.nameElement)
        })

        // Mobile Tap-Hold could also trigger action, but let's stick to name click for now + double click

        return this.element
    }

    update(data: MobData): void {
        // console.log(`[MobDisplay] update called for ${data.nom}`)
        this.currentData = data // UPDATE CURRENT DATA
        this.updateHealthIndicator(data)
        
        // Only rebuild HTML if necessary (skin, weapon, status changed significantly)
        // For now, let's just do it intelligently
        const weapons = Array.isArray(data.weapons) ? data.weapons : []
        const displayedWeapon = weapons.length > 0 ? weapons[0] : undefined

        // Check if we need to rebuild the inner HTML
        // Simplest way: Check if the image source or weapon changed. 
        // But since we use innerHTML string, let's just rebuild it safely BUT check for existing structure first?
        // Actually, replacing innerHTML WILL kill hover states.
        
        // Let's create the structure ONCE during constructor and only update src/classes here
        // But the previous implementation used innerHTML replacement.
        
        // FIX: Construct the HTML string and compare with current? No, that's heavy.
        // Better: Query existing elements and update them.
        
        // 1. Image
        let img = this.mobInner.querySelector('.mob-image') as HTMLImageElement
        if (!img) {
             // Init structure if missing (first run)
             this.mobInner.innerHTML = `
                <img src="${data.imageUrl}" class="mob-image" draggable="false" />
                <div class="skin-layers"></div>
                <div class="weapon-mount"></div>
                <div class="status-marker"></div>
             `
             img = this.mobInner.querySelector('.mob-image') as HTMLImageElement
        }

        if (img.src !== data.imageUrl) img.src = data.imageUrl
        
        // 2. Skins
        const skinContainer = this.mobInner.querySelector('.skin-layers')
        if (skinContainer) {
             // Simple rebuild of skins is fine as they are non-interactive pointer-events: none
             skinContainer.innerHTML = `<div class="layer hat-layer ${data.skin?.hat || 'none'}"></div>`
        }

        // 3. Weapon
        const weaponMount = this.mobInner.querySelector('.weapon-mount')
        if (weaponMount) {
            if (displayedWeapon) {
                 // Check if already has this weapon? 
                 // Just rebuild weapon HTML, it's safer.
                 weaponMount.innerHTML = `
                    <div class="hub-weapon-pivot" style="position: absolute; top: 50%; right: -15px; width: 40px; height: 40px; z-index: 20; pointer-events: none; transform-origin: center center;">
                        <div class="hub-weapon-container" style="width: 100%; height: 100%; position: relative; filter: drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.5)); animation: weapon-float 2s infinite ease-in-out;">
                            <img src="assets/weapons/${WEAPON_REGISTRY[displayedWeapon]?.icon || 'toothpick.png'}" class="weapon-icon" style="width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated;" />
                        </div>
                    </div>`
            } else {
                weaponMount.innerHTML = ''
            }
        }

        // 4. Status (Dead)
        const statusMarker = this.mobInner.querySelector('.status-marker')
        if (statusMarker) {
            statusMarker.innerHTML = data.status === 'mort' ? '<div class="dead-marker">💀</div>' : ''
        }

        this.nameElement.textContent = data.nom

        if (data.status === 'mort') {
            this.element.classList.add('dead')
        } else {
            this.element.classList.remove('dead')
        }
    }

    setSelected(selected: boolean): void {
        if (selected) {
            this.element.classList.add('selected')
        } else {
            this.element.classList.remove('selected')
        }
    }

    private showTooltip(data: MobData): void {
        if (this.tooltip) this.hideTooltip()

        this.tooltip = document.createElement('div')
        this.tooltip.className = 'trait-tooltip'
        this.tooltip.style.position = 'absolute'
        this.tooltip.style.pointerEvents = 'none'
        // Ensure high z-index
        this.tooltip.style.zIndex = '99999'

        let weaponsHtml = ''
        const weapons = Array.isArray(data.weapons) ? data.weapons : []

        if (weapons.length > 0) {
            weaponsHtml = `<div style="display:flex; gap:4px; margin-top:5px; flex-wrap:wrap;">`
            weapons.forEach(w => {
                try {
                    const icon = (WEAPON_REGISTRY && WEAPON_REGISTRY[w]?.icon) || 'toothpick.png'
                    weaponsHtml += `<img src="assets/weapons/${icon}" style="width:20px; height:20px; background:rgba(255,255,255,0.1); border-radius:3px; padding:2px;" title="${w}" />`
                } catch (e) {
                    console.warn('Error loading weapon icon for', w, e)
                }
            })
            weaponsHtml += `</div>`
        }

        this.tooltip.innerHTML = `
            <h4>${data.nom}</h4>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:5px;">
               <span style="font-size:11px; color:#aaa;">Lvl ${data.level}</span>
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px; font-size:11px;">
                <div style="color:#ff6b6b;">STR: ${data.stats.force}</div>
                <div style="color:#4ecdc4;">VIT: ${data.stats.vitalite}</div>
                <div style="color:#ffe66d;">AGI: ${data.stats.agilite}</div>
                <div style="color:#a8e6cf;">SPD: ${data.stats.vitesse}</div>
            </div>

            <div style="margin-top:8px; padding-top:5px; border-top:1px dashed rgba(255,255,255,0.1); display:flex; justify-content:space-between; font-size:10px; color:#aaa;">
                <span>HP ${data.vie}/${100 + (data.stats.vitalite * (data.hpMultiplier || 10))}</span>
                <span>⚡ ${Math.floor(data.energie)}%</span>
            </div>
            
            ${weaponsHtml}

            ${data.traits.length > 0 ? `<div style="margin-top:5px; font-size:10px; color:#a29bfe;">${data.traits.length} Mutations</div>` : ''}
        `

        document.body.appendChild(this.tooltip)
        this.updateTooltipPosition()

        this.isTrackingTooltip = true
        this.trackTooltip()
    }

    private hideTooltip(): void {
        this.isTrackingTooltip = false
        if (this.rafId) {
            cancelAnimationFrame(this.rafId)
            this.rafId = null
        }
        if (this.tooltip) {
            this.tooltip.style.opacity = '0'
            this.tooltip.style.visibility = 'hidden'
        }
    }

    setHealingState(isHealing: boolean): void {
        let container = this.element.querySelector('.healing-container') as HTMLElement | null
        
        if (isHealing) {
            if (!container) {
                container = document.createElement('div')
                container.className = 'healing-container'
                container.style.pointerEvents = 'none' // Force pointer-events: none to prevent blocking clicks
                // Add particles
                for (let i = 0; i < 3; i++) {
                    const particle = document.createElement('div')
                    particle.className = 'healing-particle'
                    particle.textContent = '+'
                    container.appendChild(particle)
                }
                this.element.appendChild(container)
            }
        } else {
            if (container) {
                container.remove()
            }
        }
    }

    private trackTooltip(): void {
        if (!this.isTrackingTooltip) return
        this.updateTooltipPosition()
        this.rafId = requestAnimationFrame(() => this.trackTooltip())
    }

    private updateTooltipPosition(): void {
        if (!this.tooltip || !this.element) return

        const rect = this.element.getBoundingClientRect()
        const tooltipWidth = this.tooltip.offsetWidth || 200

        // Center above mob
        let left = rect.left + (rect.width / 2) - (tooltipWidth / 2)
        // Position above the mob visual (not including name)
        let top = rect.top - this.tooltip.offsetHeight - 10

        // Bounds
        if (left < 10) left = 10
        if (left + tooltipWidth > window.innerWidth - 10) left = window.innerWidth - tooltipWidth - 10
        if (top < 10) top = rect.bottom + 10

        this.tooltip.style.left = `${left}px`
        this.tooltip.style.top = `${top}px`
    }

    private updateHealthIndicator(data: MobData): void {
        let hpEl = this.element.querySelector('.mob-onsen-hp') as HTMLElement
        
        const maxHP = 100 + (data.stats.vitalite * (data.hpMultiplier || 10))
        const isNotFullLife = data.vie < maxHP
        const isInOnsen = !!data.isInOnsen
        const showIndicator = isInOnsen || isNotFullLife

        if (showIndicator) {
            if (!hpEl) {
                hpEl = document.createElement('div')
                hpEl.className = 'mob-onsen-hp'
                // Use a standard top offset and ensure it's not rotated
                hpEl.style.position = 'absolute'
                hpEl.style.top = '-50px' // Slightly above name (-25px)
                hpEl.style.left = '50%'
                hpEl.style.transform = 'translateX(-50%)'
                this.element.appendChild(hpEl)
            }
            const percent = Math.min(100, Math.floor((data.vie / maxHP) * 100))
            const prefix = isInOnsen ? '♨️' : '❤️'
            
            // Console log for debugging health bar disappearance
            if (isInOnsen) {
                console.log(`[MobDisplay] ${data.nom} is in Onsen. ShowIndicator: ${showIndicator}, HP: ${data.vie}/${maxHP}`)
            }

            hpEl.textContent = `${prefix} ${percent}%`
            hpEl.style.display = 'block'
            
            // Optional: Color based on health
            if (percent < 30) hpEl.style.color = '#ff6b6b'
            else if (percent < 70) hpEl.style.color = '#ffe66d'
            else hpEl.style.color = '#4ecdc4'
        } else if (hpEl) {
            hpEl.style.display = 'none'
        }
    }

    destroy(): void {
        this.hideTooltip()
        this.element.remove()
    }
}
