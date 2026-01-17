import { MobStatus } from '../../../shared/types'
import Matter from 'matter-js'
import { PhysicsWorld } from '../physics/PhysicsWorld'

export class MobMovement {
    public body: Matter.Body
    private isHeld: boolean = false
    private updateInterval: number | null = null

    // Balance constants
    private readonly UPRIGHT_STIFFNESS = 0.05
    private readonly UPRIGHT_TORQUE_MAX = 5 // Limit torque to avoid spinning wildly

    constructor(
        private element: HTMLElement,
        private physicsWorld: PhysicsWorld,
        private status: MobStatus,
        initialX: number
    ) {
        // Create physics body
        // Approximating mob as a rectangle. 
        // Visual size is approx 120px wide (from CSS .mob-image), but let's check bounding box.
        // Assuming ~80x100 for proper physics fit effectively.
        const startX = initialX || Math.random() * (window.innerWidth - 100) + 50
        const startY = -100 + 500 // Drop from sky (lower start)

        // Set static styles once
        this.element.style.position = 'absolute'
        this.element.style.left = '0'
        this.element.style.top = '0'
        this.element.style.bottom = 'auto'

        this.body = Matter.Bodies.rectangle(startX, startY, 80, 100, {
            chamfer: { radius: 20 }, // Rounded corners
            restitution: 0.3, // Bounciness
            friction: 0.5,
            frictionAir: 0.02, // Damping
            density: 0.002,
            label: 'Mob'
        })

        // Add to world
        physicsWorld.addBody(this.body)

        // Start sync loop
        this.startSync()

        // Hook into mouse events to know if held
        // We can check if body.speed is very low to determine 'resting'
    }

    private startSync(): void {
        const update = () => {
            if (!this.element || !this.body) return

            const { x, y } = this.body.position
            const angle = this.body.angle

            // Out of bounds check (Respawn)
            const buffer = 200
            const screenWidth = window.innerWidth
            const screenHeight = window.innerHeight

            // If mob goes too far left, right, or down (fallen through floor?)
            if (x < -buffer || x > screenWidth + buffer || y > screenHeight + buffer) {
                // Respawn logic
                const respawnX = Math.random() * (screenWidth - 100) + 50
                // Match the spawn height from constructor: -100 + 500 = 400
                const respawnY = 400

                Matter.Body.setPosition(this.body, { x: respawnX, y: respawnY })
                Matter.Body.setVelocity(this.body, { x: 0, y: 0 })
                Matter.Body.setAngle(this.body, 0)
                Matter.Body.setAngularVelocity(this.body, 0)

                // Continue loop but skip visual update for this frame (prevent glitch rendering at old pos)
                requestAnimationFrame(update)
                return
            }

            // Sync DOM position
            // DOM center is determined by transform. 
            // CSS .mob position is absolute bottom: 50px. Wait.
            // CSS says: .mob { bottom: 50px; ... } which anchors it to bottom.
            // To use physics X/Y freely, we should change .mob to top/left positioning or use transform translate.
            // Using transform translate is better for performance.



            // Matter.js positions are center of mass.
            // HTML transform origin is usually center.
            // We apply translate to (x, y) minus half width/height? 
            // Better: translate3d(x - w/2, y - h/2, 0)
            // But CSS .mob has flex layout.
            // Let's assume the element acts as the container.

            // Offset for visual center
            // Body is 80x100. Visual is 120x120.
            // We want to center horizontally: -60 is correct (x - 60 + 60 = x).
            // We want to align bottoms:
            // Body bottom = y + 50. Visual bottom = y + offsetY + 120.
            // y + 50 = y + offsetY + 120  =>  offsetY = 50 - 120 = -70.
            const offsetX = -60
            const offsetY = -70

            this.element.style.transform = `translate(${x + offsetX}px, ${y + offsetY}px) rotate(${angle}rad)`

            // Balance logic: Try to stay upright
            // Target the NEAREST upright angle (0, 2PI, 4PI, etc.)
            // This prevents "unwinding" spins.
            const currentAngle = this.body.angle
            const twoPi = 2 * Math.PI

            // Calculate deviation from nearest upright position
            // remainder will be between -PI and +PI
            // We want angle % 2PI, but centered around 0.
            // Math.round(angle / 2PI) * 2PI gives the nearest anchor.
            const nearestUpright = Math.round(currentAngle / twoPi) * twoPi
            const angleDiff = currentAngle - nearestUpright

            if (Math.abs(angleDiff) > 0.01) {
                // Apply restoring torque against the difference
                // Increase stiffness lightly to compensate for shorter travel
                let torque = -angleDiff * (this.UPRIGHT_STIFFNESS * 2)

                // Clamp torque
                torque = Math.max(-this.UPRIGHT_TORQUE_MAX, Math.min(this.UPRIGHT_TORQUE_MAX, torque))

                this.body.torque = torque
            }

            // RECOVERY JUMP LOGIC
            // If we are tilted too far ("fallen", e.g. > 60 degrees) and stationary on ground, try to hop up.
            // 60 degrees is approx 1.0 radian.
            if (Math.abs(angleDiff) > 1.0) {
                // Check if almost stationary (on ground)
                if (Math.abs(this.body.velocity.y) < 0.1 && Math.abs(this.body.velocity.x) < 0.1) {
                    // small random chance to hop, so they don't all pop at once or spam
                    if (Math.random() < 0.02) {
                        // Apply an upward jump force
                        Matter.Body.applyForce(this.body, this.body.position, { x: 0, y: -0.05 })

                        // Apply a strong corrective torque to help spin upright
                        // If tilted right (positive), torque negative (left).
                        const recoveryTorque = angleDiff > 0 ? -0.25 : 0.25
                        // Temporarily override torque
                        this.body.torque = recoveryTorque

                        // Set angular velocity directly for a "kick"
                        Matter.Body.setAngularVelocity(this.body, recoveryTorque * 0.2)
                    }
                }
            }

            // Velocity Capping
            const MAX_VELOCITY = 30
            const velocity = this.body.velocity
            const speed = Math.hypot(velocity.x, velocity.y)
            if (speed > MAX_VELOCITY) {
                // Scale down logic
                const ratio = MAX_VELOCITY / speed
                Matter.Body.setVelocity(this.body, {
                    x: velocity.x * ratio,
                    y: velocity.y * ratio
                })
            }

            requestAnimationFrame(update)
        }
        update()
    }

    public hop(): void {
        if (!this.body) return

        // Random jump force
        // Force is vector. Mass is implicit.
        const forceX = (Math.random() - 0.5) * 0.05
        const forceY = -0.05 - Math.random() * 0.05

        Matter.Body.applyForce(this.body, this.body.position, { x: forceX, y: forceY })
    }

    public destroy(): void {
        if (this.physicsWorld && this.body) {
            this.physicsWorld.removeBody(this.body)
        }
    }

    // Keep interface compatible-ish if needed, or refactor consumers
    getPosX(): number {
        return this.body ? this.body.position.x : 0
    }

    // Legacy support (noop or adapt)
    updateStatus(status: MobStatus): void { this.status = status }
    start(): void { }
    stop(): void { }
}
