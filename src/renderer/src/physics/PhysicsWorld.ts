import Matter from 'matter-js'

export class PhysicsWorld {
    public engine: Matter.Engine
    public world: Matter.World
    private runner: Matter.Runner
    private render: Matter.Render
    private canvas: HTMLCanvasElement
    private lastHighFiveTime: number = 0
    private onsenSensor: Matter.Body | null = null
    private onsenWalls: Matter.Body[] = []
    
    // Callback for mid-air collisions (HIGH-FIVE!)
    public onHighFive: ((x: number, y: number) => void) | null = null
    
    // Callback for when a body is dropped
    public onDraggableDropped: ((body: Matter.Body) => void) | null = null

    // Collision Categories
    public static readonly CATEGORY_MOB = 0x0001
    public static readonly CATEGORY_UI = 0x0002
    public static readonly CATEGORY_WALL = 0x0004

    constructor(element: HTMLElement) {
        // Create engine
        this.engine = Matter.Engine.create()
        this.world = this.engine.world

        // Disable gravity by default (we might want some for falling, but maybe not strong)
        this.engine.gravity.y = 1
        this.engine.gravity.scale = 0.001

        // Create canvas for debug (or just for interaction)
        this.canvas = document.createElement('canvas')
        this.canvas.id = 'physics-canvas'
        this.canvas.width = window.innerWidth
        this.canvas.height = window.innerHeight
        this.canvas.style.position = 'absolute'
        this.canvas.style.top = '0'
        this.canvas.style.left = '0'
        this.canvas.style.pointerEvents = 'auto' // Allow interactions with canvas
        this.canvas.style.zIndex = '-5' // Ensure it's behind mobs and UI
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
        const mouse = Matter.Mouse.create(document.body) 
        // Force pixelRatio to 1 because we size canvas to CSS pixels, not device pixels
        // @ts-ignore
        mouse.pixelRatio = 1
        
        console.log('[Physics] Mouse created with pixelRatio:', (mouse as any).pixelRatio)

        const mouseConstraint = Matter.MouseConstraint.create(this.engine, {
            mouse: mouse,
            collisionFilter: {
                mask: PhysicsWorld.CATEGORY_MOB // Only interact with Mobs
            },
            constraint: {
                stiffness: 0.8, // Increased for firm grab
                render: {
                    visible: false
                }
            }
        })

        Matter.World.add(this.world, mouseConstraint)

        // Listen for events
        Matter.Events.on(mouseConstraint, 'mousedown', (event: any) => {
            console.log('[Physics] MouseDown at:', event.mouse.position, 'Offest:', (mouse as any).offset)
        })

        Matter.Events.on(mouseConstraint, 'startdrag', (event: any) => {
            console.log('[Physics] StartDrag:', event.body.label, (event.body as any).mobId)
            
            // PREVENT dragging mobs in Onsen to avoid high five jumps
            if (event.body.label === 'Mob') {
                const mobMovement = (event.body as any).mobMovement
                if (mobMovement && mobMovement.inOnsen) {
                    console.log('[Physics] Prevented drag - mob is in Onsen:', (event.body as any).mobId)
                    // Cancel the drag by removing the body from the constraint
                    mouseConstraint.body = null as any
                    return
                }
            }
            
            // If dragging a static body (e.g., mob in Onsen), make it dynamic temporarily
            if (event.body.isStatic && event.body.label === 'Mob') {
                Matter.Body.setStatic(event.body, false)
                console.log('[Physics] Made mob dynamic for dragging:', (event.body as any).mobId)
            }
        })

        // Listen for mouse up (drop)
        Matter.Events.on(mouseConstraint, 'mouseup', (event: any) => {
            const body = mouseConstraint.body
            console.log('[Physics] MouseUp at:', event.mouse.position, 'Dragged body:', body?.label, (body as any)?.mobId)
            if (body && this.onDraggableDropped) {
                this.onDraggableDropped(body)
            }
        })

        // Keep the mouse in sync with rendering
        this.render.mouse = mouse
        
        // --- COLLISION DETECTION FOR HIGH-FIVES ---
        Matter.Events.on(this.engine, 'collisionStart', (event: any) => {
            if (event && event.pairs) {
                event.pairs.forEach((pair: any) => {
                const { bodyA, bodyB } = pair
                
                // PRIORITY: Check for Onsen collision - mark mob as in Onsen
                const mobBody = bodyA.label === 'Mob' ? bodyA : (bodyB.label === 'Mob' ? bodyB : null)
                const onsenBody = bodyA.label === 'OnsenSensor' ? bodyA : (bodyB.label === 'OnsenSensor' ? bodyB : null)
                
                if (mobBody && onsenBody) {
                    console.log('[Physics] Mob touching Onsen:', (mobBody as any).mobId)
                    
                    // IMMEDIATELY set inOnsen flag to prevent jumps and high five
                    const mobMovement = (mobBody as any).mobMovement
                    if (mobMovement && typeof mobMovement.setInOnsen === 'function') {
                        mobMovement.setInOnsen(true)
                    }
                    
                    return // Skip other collision checks
                }
                
                // Check if both are Mobs (not walls)
                if (bodyA.label === 'Mob' && bodyB.label === 'Mob') {
                    // PREVENT high five if either mob is in Onsen
                    const mobMovementA = (bodyA as any).mobMovement
                    const mobMovementB = (bodyB as any).mobMovement
                    
                    if ((mobMovementA && mobMovementA.inOnsen) || (mobMovementB && mobMovementB.inOnsen)) {
                        console.log('[Physics] Prevented high five - one or both mobs in Onsen')
                        return
                    }
                    
                    // Check if both are airborne (moving upward or just launched)
                    const isAirborne = bodyA.velocity.y < -2 || bodyB.velocity.y < -2
                    
                    if (isAirborne) {
                        // Check cooldown (5 seconds)
                        const now = Date.now()
                        if (now - this.lastHighFiveTime > 5000) {
                            this.lastHighFiveTime = now
                            
                            // Calculate collision point (midpoint)
                            const x = (bodyA.position.x + bodyB.position.x) / 2
                            const y = (bodyA.position.y + bodyB.position.y) / 2
                            
                            // Trigger callback!
                            if (this.onHighFive) {
                                this.onHighFive(x, y)
                            }
                        }
                    }
                }
            })
        }
    })

    // --- COLLISION END (EXIT ONSEN) ---
    Matter.Events.on(this.engine, 'collisionEnd', (event: any) => {
        if (event && event.pairs) {
            event.pairs.forEach((pair: any) => {
                const { bodyA, bodyB } = pair
                
                // Check for Mob leaving Onsen
                const mobBody = bodyA.label === 'Mob' ? bodyA : (bodyB.label === 'Mob' ? bodyB : null)
                const onsenBody = bodyA.label === 'OnsenSensor' ? bodyA : (bodyB.label === 'OnsenSensor' ? bodyB : null)
                
                if (mobBody && onsenBody) {
                    console.log('[Physics] Mob left Onsen:', (mobBody as any).mobId)
                    
                    const mobMovement = (mobBody as any).mobMovement
                    if (mobMovement) {
                        mobMovement.setInOnsen(false)
                    }
                }
            })
        }
    })

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
        // Right wall moved 200px left to prevent potatoes going behind action menu
        const rightWall = Matter.Bodies.rectangle(width - 200 + wallThickness / 2, height / 2, wallThickness, height * 2, {
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
        
        // Remove only boundaries (walls/floor)
        const walls = Matter.Composite.allBodies(this.world).filter(b => b.label === 'Wall')
        Matter.World.remove(this.world, walls)
        
        // Re-create them with new dimensions
        this.setupBoundaries()
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

    /**
     * Toggles Matter.js debug renderer visibility
     */
    public toggleDebug(): boolean {
        const isDebug = !this.render.options.wireframes
        this.render.options.wireframes = isDebug
        
        if (isDebug) {
            this.canvas.style.zIndex = '9999' // Front of everything
            this.canvas.style.pointerEvents = 'none'
            // Force red wireframes for all bodies in debug mode
            // @ts-ignore
            this.render.options.wireframeStrokeStyle = '#ff0000'
            this.render.options.showAngleIndicator = true
            Matter.Render.run(this.render)
        } else {
            this.canvas.style.zIndex = '-5' // Back behind
            this.canvas.style.pointerEvents = 'none'
            Matter.Render.stop(this.render)
            // Clear canvas
            const ctx = this.canvas.getContext('2d')
            ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height)
        }

        console.log('[Physics] Debug mode:', isDebug)
        return isDebug
    }

    /**
     * Updates the Onsen sensor body to match the visual rect
     * (Coordinates should be absolute window coords before parallax)
     */
    public updateOnsenSensor(rect: DOMRect): void {
        const parallaxX = parseFloat(document.body.style.getPropertyValue('--parallax-x') || '0')
        const parallaxY = parseFloat(document.body.style.getPropertyValue('--parallax-y') || '0')
        const shiftX = parallaxX * 0.6
        const shiftY = parallaxY * 0.6

        const x = (rect.left + rect.width / 2) - shiftX
        const y = (rect.top + rect.height / 2) - shiftY

        if (this.onsenSensor) {
            Matter.Body.setPosition(this.onsenSensor, { x, y })
            return
        }

        this.onsenSensor = Matter.Bodies.rectangle(
            x,
            y,
            rect.width,
            rect.height,
            {
                isStatic: true,
                isSensor: true,
                collisionFilter: {
                    category: PhysicsWorld.CATEGORY_UI,
                    mask: PhysicsWorld.CATEGORY_MOB // Sense mobs, but don't stop clicks
                },
                render: {
                    visible: true,
                    strokeStyle: '#00ff00', // Green wireframe for Onsen
                    lineWidth: 3
                },
                label: 'OnsenSensor'
            }
        )

        Matter.World.add(this.world, this.onsenSensor)
    }

    public updateOnsenWalls(rect: DOMRect): void {
        // Remove old walls if they exist
        if (this.onsenWalls.length > 0) {
            Matter.World.remove(this.world, this.onsenWalls)
            this.onsenWalls = []
        }

        // Get parallax offset
        const parallaxX = parseFloat(document.body.style.getPropertyValue('--parallax-x') || '0')
        const parallaxY = parseFloat(document.body.style.getPropertyValue('--parallax-y') || '0')
        const shiftX = parallaxX * 0.6
        const shiftY = parallaxY * 0.6

        const wallThickness = 20
        const wallHeight = rect.height * 0.7 // Only 70% height to keep top open

        // Left wall
        const leftWall = Matter.Bodies.rectangle(
            (rect.left - wallThickness / 2) - shiftX,
            (rect.top + rect.height / 2) - shiftY,
            wallThickness,
            wallHeight,
            {
                isStatic: true,
                render: { visible: false },
                label: 'OnsenWall'
            }
        )

        // Right wall
        const rightWall = Matter.Bodies.rectangle(
            (rect.right + wallThickness / 2) - shiftX,
            (rect.top + rect.height / 2) - shiftY,
            wallThickness,
            wallHeight,
            {
                isStatic: true,
                render: { visible: false },
                label: 'OnsenWall'
            }
        )

        this.onsenWalls = [leftWall, rightWall]
        Matter.World.add(this.world, this.onsenWalls)
    }

    public removeBody(body: Matter.Body): void {
        Matter.World.remove(this.world, body)
    }

    /**
     * Updates the internal mouse offset to stay in sync with parallax effects
     */
    public setMouseOffset(x: number, y: number): void {
        const mouse = this.render.mouse
        if (mouse) {
            Matter.Mouse.setOffset(mouse, { x, y })
        }
    }
}
