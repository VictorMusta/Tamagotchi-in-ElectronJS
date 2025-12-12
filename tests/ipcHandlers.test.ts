import { registerMobHandlers } from '../src/main/ipcHandlers'
import { MobManager } from '../src/main/MobService'

// Mock de ipcMain.handle pour capturer les handlers
const handlers: Map<string, Function> = new Map()

jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn((channel: string, handler: Function) => {
      handlers.set(channel, handler)
    }),
    on: jest.fn()
  },
  app: {
    getPath: jest.fn().mockReturnValue('/tmp/test-app')
  }
}))

describe('IPC Handlers', () => {
  beforeAll(() => {
    registerMobHandlers()
  })

  beforeEach(() => {
    MobManager.clear()
  })

  describe('mob:create', () => {
    it('should register the handler', () => {
      expect(handlers.has('mob:create')).toBe(true)
    })

    it('should create a mob and return success', async () => {
      const handler = handlers.get('mob:create')!
      const result = await handler({}, 'NewMob', 'mob.png')

      expect(result.success).toBe(true)
      expect(result.mob).toBeDefined()
      expect(result.mob.nom).toBe('NewMob')
    })
  })

  describe('mob:delete', () => {
    it('should register the handler', () => {
      expect(handlers.has('mob:delete')).toBe(true)
    })

    it('should delete a dead mob', async () => {
      const mob = MobManager.createMob('ToDelete', 'mob.png')
      MobManager.damageMob(mob.id, 200)

      const handler = handlers.get('mob:delete')!
      const result = await handler({}, mob.id)

      expect(result.success).toBe(true)
    })

    it('should fail to delete a living mob', async () => {
      const mob = MobManager.createMob('Living', 'mob.png')

      const handler = handlers.get('mob:delete')!
      const result = await handler({}, mob.id)

      expect(result.success).toBe(false)
    })
  })

  describe('mob:damage', () => {
    it('should register the handler', () => {
      expect(handlers.has('mob:damage')).toBe(true)
    })

    it('should damage a mob', async () => {
      const mob = MobManager.createMob('Target', 'mob.png')

      const handler = handlers.get('mob:damage')!
      const result = await handler({}, mob.id, 25)

      expect(result.success).toBe(true)
      expect(result.mob.vie).toBe(75)
    })
  })

  describe('mob:heal', () => {
    it('should register the handler', () => {
      expect(handlers.has('mob:heal')).toBe(true)
    })

    it('should heal a mob', async () => {
      const mob = MobManager.createMob('Injured', 'mob.png')
      MobManager.damageMob(mob.id, 40)

      const handler = handlers.get('mob:heal')!
      const result = await handler({}, mob.id, 20)

      expect(result.success).toBe(true)
      expect(result.mob.vie).toBe(80)
    })
  })

  describe('mob:feed', () => {
    it('should register the handler', () => {
      expect(handlers.has('mob:feed')).toBe(true)
    })

    it('should feed a mob', async () => {
      const mob = MobManager.createMob('Hungry', 'mob.png')

      const handler = handlers.get('mob:feed')!
      const result = await handler({}, mob.id, 20)

      expect(result.success).toBe(true)
    })
  })

  describe('mob:revive', () => {
    it('should register the handler', () => {
      expect(handlers.has('mob:revive')).toBe(true)
    })

    it('should revive a dead mob', async () => {
      const mob = MobManager.createMob('Dead', 'mob.png')
      MobManager.damageMob(mob.id, 200)

      const handler = handlers.get('mob:revive')!
      const result = await handler({}, mob.id)

      expect(result.success).toBe(true)
      expect(result.mob.status).toBe('vivant')
    })
  })

  describe('mob:rename', () => {
    it('should register the handler', () => {
      expect(handlers.has('mob:rename')).toBe(true)
    })

    it('should rename a mob', async () => {
      const mob = MobManager.createMob('OldName', 'mob.png')

      const handler = handlers.get('mob:rename')!
      const result = await handler({}, mob.id, 'NewName')

      expect(result.success).toBe(true)
      expect(result.mob.nom).toBe('NewName')
    })
  })

  describe('mob:getAll', () => {
    it('should register the handler', () => {
      expect(handlers.has('mob:getAll')).toBe(true)
    })

    it('should return all mobs', async () => {
      MobManager.createMob('Mob1', 'mob1.png')
      MobManager.createMob('Mob2', 'mob2.png')

      const handler = handlers.get('mob:getAll')!
      const result = await handler({})

      expect(result.success).toBe(true)
      expect(result.mobs).toHaveLength(2)
    })
  })

  describe('mob:getById', () => {
    it('should register the handler', () => {
      expect(handlers.has('mob:getById')).toBe(true)
    })

    it('should return a specific mob', async () => {
      const mob = MobManager.createMob('Specific', 'mob.png')

      const handler = handlers.get('mob:getById')!
      const result = await handler({}, mob.id)

      expect(result.success).toBe(true)
      expect(result.mob.id).toBe(mob.id)
    })

    it('should return error for non-existing mob', async () => {
      const handler = handlers.get('mob:getById')!
      const result = await handler({}, 'non-existent')

      expect(result.success).toBe(false)
    })
  })

  describe('mob:save', () => {
    it('should register the handler', () => {
      expect(handlers.has('mob:save')).toBe(true)
    })
  })

  describe('mob:load', () => {
    it('should register the handler', () => {
      expect(handlers.has('mob:load')).toBe(true)
    })
  })
})
