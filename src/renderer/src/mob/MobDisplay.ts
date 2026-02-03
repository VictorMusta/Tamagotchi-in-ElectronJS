import { MobData } from '../../../shared/types'
import { WEAPON_REGISTRY } from '../../../shared/WeaponRegistry'

export class MobDisplay {
    public element: HTMLElement
    private tooltip: HTMLElement | null = null
    private isTrackingTooltip: boolean = false
    private rafId: number | null = null

    // Elements
    private mobInner: HTMLElement
    private nameElement: HTMLElement

    constructor(data: MobData) {
        this.element = document.createElement('div')
        this.element.className = 'mob'
        this.element.id = `mob-${data.id}`

        // Create inner container
        this.mobInner = document.createElement('div')
        this.mobInner.className = 'mob-inner'

        // Create Name Element
        this.nameElement = document.createElement('div')
        this.nameElement.className = 'mob-name'
        this.nameElement.style.position = 'absolute'
        this.nameElement.style.top = '-25px'
        this.nameElement.style.left = '50%'
        this.nameElement.style.transform = 'translateX(-50%)'
        this.nameElement.style.color = 'white'
        this.nameElement.style.background = 'rgba(0,0,0,0.5)'
        this.nameElement.style.padding = '2px 6px'
        this.nameElement.style.borderRadius = '4px'
        this.nameElement.style.fontSize = '12px'
        this.nameElement.style.whiteSpace = 'nowrap'
        this.nameElement.style.pointerEvents = 'auto' // Important for clicking name
        this.nameElement.style.cursor = 'pointer'

        this.element.appendChild(this.mobInner)
        this.element.appendChild(this.nameElement)

        this.update(data)

        // Tooltip Listeners (On the mob visual, not the name necessarily)
        this.mobInner.addEventListener('mouseenter', () => this.showTooltip(data))
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
        const weapons = Array.isArray(data.weapons) ? data.weapons : []
        const displayedWeapon = weapons.length > 0 ? weapons[0] : undefined

        this.mobInner.innerHTML = `
            <img src="${data.imageUrl}" class="mob-image" draggable="false" />
            <div class="skin-layers">
                <div class="layer hat-layer ${data.skin?.hat || 'none'}"></div>

            </div>
            ${displayedWeapon ? `
            <div class="hub-weapon-icon" style="
                position: absolute;
                bottom: 5px;
                right: -5px;
                width: 24px;
                height: 24px;
                background-image: url('assets/weapons/${WEAPON_REGISTRY[displayedWeapon]?.icon || 'toothpick.png'}');
                background-size: cover;
                image-rendering: pixelated;
                z-index: 5;
            "></div>
            ` : ''}
            ${data.status === 'mort' ? '<div class="dead-marker">💀</div>' : ''}
        `

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
                <span>HP ${data.vie}/${100 + (data.stats.vitalite * 5)}</span>
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
            this.tooltip.remove()
            this.tooltip = null
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

    destroy(): void {
        this.hideTooltip()
        this.element.remove()
    }
}
