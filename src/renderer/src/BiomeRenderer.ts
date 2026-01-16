export interface BiomeObjectData {
    id: string
    type: 'tree' | 'flower'
    x: number
    y: number
    level: number
}

export class BiomeRenderer {
    private container: HTMLElement
    private objects: BiomeObjectData[] = []

    constructor(containerId: string) {
        this.container = document.getElementById(containerId) || document.body
    }

    addObject(type: 'tree' | 'flower', x: number): void {
        const obj: BiomeObjectData = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            x,
            y: 0,
            level: type === 'tree' ? 1 : 0
        }
        this.objects.push(obj)
        this.renderObject(obj, true)
    }

    private renderObject(data: BiomeObjectData, isNew: boolean = false): void {
        const el = document.createElement('div')
        el.className = `biome-object ${data.type} level-${data.level}`
        if (isNew) el.classList.add('new')
        el.id = `biome-${data.id}`
        el.style.left = `${data.x}px`

        // Contenu visuel (Emoji pour le moment, extensible à des images)
        const content = document.createElement('span')
        content.innerText = data.type === 'tree' ? '🌳' : '🌸'
        el.appendChild(content)

        this.container.appendChild(el)
    }

    setObjects(objects: BiomeObjectData[]): void {
        this.objects = objects
        this.container.innerHTML = ''
        this.objects.forEach(obj => this.renderObject(obj))
    }

    getObjects(): BiomeObjectData[] {
        return this.objects
    }

    /**
     * Fait pousser les arbres existants
     */
    growTrees(): void {
        this.objects.forEach(obj => {
            if (obj.type === 'tree' && obj.level < 3) {
                obj.level++
                const el = document.getElementById(`biome-${obj.id}`)
                if (el) {
                    el.className = `biome-object ${obj.type} level-${obj.level}`
                }
            }
        })
    }
}
