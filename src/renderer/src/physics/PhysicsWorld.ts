import Matter from 'matter-js'

export class PhysicsWorld {
    public engine: Matter.Engine
    public world: Matter.World
    private runner: Matter.Runner
    private render: Matter.Render
    private canvas: HTMLCanvasElement

    constructor(element: HTMLElement) {
        // Create engine
        this.engine = Matter.Engine.create()
        this.world = this.engine.world

        // Disable gravity by default (we might want some for falling, but maybe not strong)
        this.engine.gravity.y = 1
        this.engine.gravity.scale = 0.001

        // Create canvas for debug (or just for interaction)
        this.canvas = document.createElement('canvas')
        this.canvas.width = window.innerWidth
        this.canvas.height = window.innerHeight
        this.canvas.style.position = 'absolute'
        this.canvas.style.top = '0'
        this.canvas.style.left = '0'
        this.canvas.style.pointerEvents = 'auto' // Allow interactions with canvas
        this.canvas.style.zIndex = '0' // Ensure it's behind UI but interactive
        this.canvas.style.background = 'transparent' // Ensure canvas is transparent

        // Actually, we need the canvas to catch mouse events for Matter.js MouseConstraint
        // BUT, since we bind MouseConstraint to document.body, the canvas doesn't need to capture events.

        element.appendChild(this.canvas)

        // Create renderer (useful for debugging, can be hidden)
        this.render = Matter.Render.create({
            canvas: this.canvas,
            engine: this.engine,
            options: {
                width: window.innerWidth,
                height: window.innerHeight,
                wireframes: false, // Disable debug view for production look
                background: 'transparent',
                wireframeBackground: 'transparent' // Just in case
            }
        })

        // Filter: grayscale(0) to ensure no inherited filters
        this.canvas.style.filter = 'none'

        // Create runner
        this.runner = Matter.Runner.create()

        // Add walls and floor
        this.setupBoundaries()

        // Mouse Constraint
        const mouse = Matter.Mouse.create(this.canvas) // Bind to canvas instead of body to avoid stealing UI clicks
        const mouseConstraint = Matter.MouseConstraint.create(this.engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                render: {
                    visible: false
                }
            }
        })

        // Important: allow mouse interaction with bodies but don't block clicks on UI elements
        // This is tricky. 
        // If we set pixelRatio, it might help visual sharpness too
        // this.render.options.pixelRatio = window.devicePixelRatio

        Matter.World.add(this.world, mouseConstraint)

        // Keep the mouse in sync with rendering
        this.render.mouse = mouse

        // Start
        this.start()

        // Handle resize
        window.addEventListener('resize', () => this.handleResize())
    }

    private setupBoundaries(): void {
        const width = window.innerWidth
        const height = window.innerHeight
        const wallThickness = 5000

        const ground = Matter.Bodies.rectangle(width / 2, height + wallThickness / 2 - 10 - 100, width, wallThickness, {
            isStatic: true,
            render: { visible: false }, // Hide walls
            label: 'Wall'
        })
        const leftWall = Matter.Bodies.rectangle(0 - wallThickness / 2, height / 2, wallThickness, height * 2, {
            isStatic: true,
            render: { visible: false },
            label: 'Wall'
        })
        const rightWall = Matter.Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height * 2, {
            isStatic: true,
            render: { visible: false },
            label: 'Wall'
        })

        // Ceiling (optional, prevents flying off)
        const ceiling = Matter.Bodies.rectangle(width / 2, -wallThickness * 2, width, wallThickness, {
            isStatic: true,
            render: { visible: false },
            label: 'Wall'
        })

        Matter.World.add(this.world, [ground, leftWall, rightWall, ceiling])
    }

    private handleResize(): void {
        this.canvas.width = window.innerWidth
        this.canvas.height = window.innerHeight
        this.render.options.width = window.innerWidth
        this.render.options.height = window.innerHeight
        Matter.World.clear(this.world, false)
        Matter.Engine.clear(this.engine)
        this.setupBoundaries()
        // Note: resizing flushes bodies, might need to re-add mobs. 
        // Better strategy for walls: update their positions instead of clearing world.
        // For prototype speed, full reset is risky for persisting mobs.
        // TODO: Update wall positions dynamically.
    }

    public start(): void {
        // Matter.Render.run(this.render) // Optimize: Disable debug renderer since we use DOM
        Matter.Runner.run(this.runner, this.engine)
    }

    public stop(): void {
        Matter.Render.stop(this.render)
        Matter.Runner.stop(this.runner)
    }

    public addBody(body: Matter.Body): void {
        Matter.World.add(this.world, body)
    }

    public removeBody(body: Matter.Body): void {
        Matter.World.remove(this.world, body)
    }
}
