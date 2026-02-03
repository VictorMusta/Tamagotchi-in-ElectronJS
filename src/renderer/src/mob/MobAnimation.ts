import { playSound } from '../SoundManager'

export class MobAnimation {
    constructor(private element: HTMLElement) { }

    playSoundEffect(sound: 'punch' | 'death' | 'revive'): void {
        playSound(sound)
        this.showSoundVisualFeedback(sound)
    }

    private showSoundVisualFeedback(sound: string): void {
        const colors: Record<string, string> = {
            punch: '#ff4444',
            death: '#000000',


            revive: '#44ffff'
        }

        const color = colors[sound] || '#ffffff'
        const img = this.element.querySelector('.mob-image') as HTMLElement
        if (img) {
            img.style.filter = `drop-shadow(0 0 20px ${color}) brightness(1.3)`
            setTimeout(() => {
                img.style.filter = ''
            }, 200)
        }
    }

    applyJumpAnimation(height: number, duration: number): void {
        this.element.style.setProperty('--jump-height', `-${height}px`)
        this.element.style.setProperty('--jump-duration', `${duration}s`)
        this.element.classList.add('jumping')
    }

    removeJumpAnimation(): void {
        this.element.classList.remove('jumping')
    }

    setFacingLeft(isLeft: boolean): void {
        this.element.classList.toggle('facing-left', isLeft)
    }
}
