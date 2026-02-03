import { MobData } from '../../../shared/types'

export class PartyUI {
    private container!: HTMLElement
    private overlay!: HTMLElement
    private isVisible: boolean = false
    private onClose: () => void
    private onUpdate: () => void

    constructor(onClose: () => void, onUpdate: () => void) {
        this.onClose = onClose
        this.onUpdate = onUpdate
        this.createUI()
    }

    private createUI(): void {
        // Create overlay
        this.overlay = document.createElement('div')
        this.overlay.className = 'party-overlay'
        this.overlay.style.display = 'none'

        // Create container
        this.container = document.createElement('div')
        this.container.className = 'party-container'

        this.overlay.appendChild(this.container)
        document.body.appendChild(this.overlay)
    }

    public async show(): Promise<void> {
        this.isVisible = true
        this.overlay.style.display = 'flex'
        await this.render()
    }

    public hide(): void {
        this.isVisible = false
        this.overlay.style.display = 'none'
        this.onClose()
    }

    public toggle(): void {
        if (this.isVisible) {
            this.hide()
        } else {
            this.show()
        }
    }

    private async render(): Promise<void> {
        this.container.innerHTML = ''

        // Header
        const header = document.createElement('div')
        header.className = 'party-header'
        const title = document.createElement('h2')
        title.textContent = 'Gestion d\'équipe (PC)'
        const closeBtn = document.createElement('button')
        closeBtn.textContent = 'X'
        closeBtn.className = 'close-btn'
        closeBtn.onclick = () => this.hide()
        header.appendChild(title)
        header.appendChild(closeBtn)
        this.container.appendChild(header)

        // Content
        const content = document.createElement('div')
        content.className = 'party-content'

        // Fetch mobs
        const result = await window.api.getAllMobs()
        if (!result.success || !result.mobs) {
            this.container.innerHTML += '<p class="error">Erreur de chargement des mobs</p>'
            return
        }

        const squad = result.mobs.filter(m => m.inSquad)
        const box = result.mobs.filter(m => !m.inSquad)

        // Squad Column
        const squadCol = this.createColumn('Équipe Active', squad.length, 10, squad, true)
        // Box Column
        const boxCol = this.createColumn('Boîte de Stockage', box.length, 999, box, false)

        content.appendChild(squadCol)
        content.appendChild(boxCol)
        this.container.appendChild(content)
    }

    private createColumn(titleText: string, current: number, max: number, mobs: MobData[], isSquad: boolean): HTMLElement {
        const col = document.createElement('div')
        col.className = 'party-column'

        const header = document.createElement('h3')
        header.textContent = `${titleText} (${current}/${max === 999 ? '∞' : max})`
        col.appendChild(header)

        const list = document.createElement('div')
        list.className = 'party-list'

        mobs.forEach(mob => {
            const card = document.createElement('div')
            card.className = 'party-card'

            const img = document.createElement('img')
            img.src = mob.imageUrl
            card.appendChild(img)

            const info = document.createElement('div')
            info.className = 'party-card-info'
            info.innerHTML = `<strong>${mob.nom}</strong><br>Lv. ${mob.level}`
            card.appendChild(info)

            const btn = document.createElement('button')
            btn.textContent = isSquad ? 'Stock ->' : '<- Équipe'
            btn.onclick = async () => {
                const res = await (window.api as any).toggleSquad(mob.id)
                if (res.success) {
                    this.render() // Re-render local UI
                    this.onUpdate() // Trigger main app update
                } else {
                    alert(res.error)
                }
            }
            card.appendChild(btn)

            // Delete Button
            const deleteBtn = document.createElement('button')
            deleteBtn.innerHTML = '🗑️'
            deleteBtn.title = "Supprimer définitivement"
            deleteBtn.style.marginLeft = '5px'
            deleteBtn.style.background = 'rgba(255, 50, 50, 0.2)'
            deleteBtn.style.border = '1px solid rgba(255, 50, 50, 0.5)'
            deleteBtn.onclick = async () => {
                if (confirm(`Supprimer ${mob.nom} définitivement ?`)) {
                    await window.api.deleteMob(mob.id)
                    this.render()
                    this.onUpdate()
                }
            }
            card.appendChild(deleteBtn)

            list.appendChild(card)
        })

        col.appendChild(list)
        return col
    }
}
