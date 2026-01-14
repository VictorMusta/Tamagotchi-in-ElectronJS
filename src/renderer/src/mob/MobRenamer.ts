export class MobRenamer {
    constructor(
        private id: string,
        private getNom: () => string,
        private setNom: (name: string) => void,
        private onRenameStart: () => void,
        private onRenameEnd: () => void,
        private onRenameCallback: (id: string, newName: string) => Promise<string>
    ) { }

    start(nameElement: HTMLElement): void {
        this.onRenameStart()

        const currentName = this.getNom()
        const input = document.createElement('input')
        input.type = 'text'
        input.value = currentName
        input.className = 'mob-name-input'

        const finishRenaming = async (): Promise<void> => {
            let newName = input.value.trim()
            if (newName && newName !== currentName) {
                newName = await this.onRenameCallback(this.id, newName)
                this.setNom(newName)
            }

            nameElement.textContent = this.getNom()
            nameElement.style.display = ''
            input.remove()

            this.onRenameEnd()
        }

        input.addEventListener('blur', finishRenaming)
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault()
                input.blur()
            } else if (e.key === 'Escape') {
                input.value = currentName
                input.blur()
            }
        })

        nameElement.style.display = 'none'
        nameElement.parentElement?.insertBefore(input, nameElement)
        input.focus()
        input.select()
    }
}
