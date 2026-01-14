import { MobStatus } from '../../../shared/types'

export class MobMovement {
    private posX: number = 0
    private targetX: number = 0
    private isMoving: boolean = false
    private moveInterval: ReturnType<typeof setInterval> | null = null
    private thinkInterval: ReturnType<typeof setInterval> | null = null

    constructor(
        private element: HTMLElement,
        private status: MobStatus,
        private isRenaming: () => boolean,
        private onJump: (distance: number, targetX: number) => void
    ) {
        this.posX = parseFloat(element.style.left) || Math.random() * (window.innerWidth - 100)
        this.targetX = this.posX
        this.element.style.left = `${this.posX}px`
    }

    updateStatus(status: MobStatus): void {
        this.status = status
        if (status === 'mort') {
            this.stop()
        } else {
            this.start()
        }
    }

    start(): void {
        if (this.status === 'mort' || this.isRenaming() || this.thinkInterval) return

        this.thinkInterval = setInterval(
            () => {
                if (this.status === 'mort' || this.isRenaming()) {
                    this.stop()
                    return
                }

                if (Math.random() < 0.7) {
                    this.chooseNewTarget()
                }
            },
            2000 + Math.random() * 3000
        )

        this.moveInterval = setInterval(() => {
            this.moveTowardsTarget()
        }, 50)
    }

    stop(): void {
        if (this.thinkInterval) {
            clearInterval(this.thinkInterval)
            this.thinkInterval = null
        }
        if (this.moveInterval) {
            clearInterval(this.moveInterval)
            this.moveInterval = null
        }
        this.isMoving = false
    }

    private chooseNewTarget(): void {
        const maxX = window.innerWidth - 100
        const minX = 50
        const distance = 100 + Math.random() * 300
        const direction = Math.random() < 0.5 ? -1 : 1

        this.targetX = this.posX + distance * direction
        this.targetX = Math.max(minX, Math.min(maxX, this.targetX))
    }

    private moveTowardsTarget(): void {
        if (this.status === 'mort' || this.isRenaming()) return

        const distance = this.targetX - this.posX

        if (Math.abs(distance) < 5) {
            this.isMoving = false
            return
        }

        if (!this.isMoving) {
            this.isMoving = true
            this.onJump(distance, this.targetX)
        }
    }

    updatePosition(newPosX: number): void {
        this.posX = newPosX
        this.element.style.left = `${this.posX}px`
    }

    getPosX(): number {
        return this.posX
    }

    getTargetX(): number {
        return this.targetX
    }

    setIsMoving(moving: boolean): void {
        this.isMoving = moving
    }

    isCurrentlyMoving(): boolean {
        return this.isMoving
    }
}
