import { playSound } from '../SoundManager'

export class MobAnimation {
    constructor(private element: HTMLElement) { }

    playSoundEffect(sound: 'punch' | 'death' | 'revive'): void {
        playSound(sound)
        this.showSoundVisualFeedback(sound)
    }

    private showSoundVisualFeedback(sound: string): void {
        // Disabled by user request (buggy blinking)
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
