import { playSound } from '../SoundManager'

export class MobAnimation {
    constructor(private element: HTMLElement) { }

    playSoundEffect(sound: 'punch' | 'death' | 'heal' | 'feed' | 'revive'): void {
        playSound(sound)
        this.showSoundVisualFeedback(sound)
    }

    private showSoundVisualFeedback(sound: string): void {
        const colors: Record<string, string> = {
            punch: '#ff4444',
            death: '#000000',
            heal: '#44ff44',
            feed: '#ffaa44',
            revive: '#44ffff'
        }

        const color = colors[sound] || '#ffffff'
        const img = this.element.querySelector('.mob-image') as HTMLElement
        if (img) {
            const originalFilter = img.style.filter
            img.style.filter = `drop-shadow(0 0 20px ${color}) brightness(1.3)`
            setTimeout(() => {
                img.style.filter = originalFilter
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
