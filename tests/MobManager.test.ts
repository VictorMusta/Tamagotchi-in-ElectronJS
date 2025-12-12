import { MobManager } from '../src/main/MobService'

describe('MobManager', () => {
  beforeEach(() => {
    MobManager.clear()
  })

  describe('createMob', () => {
    it('should create a new mob and return its data', () => {
      const mobData = MobManager.createMob('TestMob', 'test.png')

      expect(mobData.nom).toBe('TestMob')
      expect(mobData.imageUrl).toBe('test.png')
      expect(mobData.vie).toBe(100)
      expect(mobData.status).toBe('vivant')
      expect(mobData.id).toBeDefined()
    })

    it('should generate unique names for duplicate mob names', () => {
      const mob1 = MobManager.createMob('Potato', 'potato.png')
      const mob2 = MobManager.createMob('Potato', 'potato.png')
      const mob3 = MobManager.createMob('Potato', 'potato.png')

      expect(mob1.nom).toBe('Potato')
      expect(mob2.nom).toBe('Potato 2')
      expect(mob3.nom).toBe('Potato 3')
    })

    it('should increment mob count', () => {
      expect(MobManager.count()).toBe(0)

      MobManager.createMob('Mob1', 'mob1.png')
      expect(MobManager.count()).toBe(1)

      MobManager.createMob('Mob2', 'mob2.png')
      expect(MobManager.count()).toBe(2)
    })
  })

  describe('getMobById', () => {
    it('should return mob data for existing mob', () => {
      const created = MobManager.createMob('TestMob', 'test.png')

      const retrieved = MobManager.getMobById(created.id)

      expect(retrieved).not.toBeNull()
      expect(retrieved?.id).toBe(created.id)
      expect(retrieved?.nom).toBe('TestMob')
    })

    it('should return null for non-existing mob', () => {
      const retrieved = MobManager.getMobById('non-existent-id')

      expect(retrieved).toBeNull()
    })
  })

  describe('getAllMobs', () => {
    it('should return empty array when no mobs', () => {
      const mobs = MobManager.getAllMobs()

      expect(mobs).toEqual([])
    })

    it('should return all mobs', () => {
      MobManager.createMob('Mob1', 'mob1.png')
      MobManager.createMob('Mob2', 'mob2.png')
      MobManager.createMob('Mob3', 'mob3.png')

      const mobs = MobManager.getAllMobs()

      expect(mobs).toHaveLength(3)
      expect(mobs.map((m) => m.nom)).toContain('Mob1')
      expect(mobs.map((m) => m.nom)).toContain('Mob2')
      expect(mobs.map((m) => m.nom)).toContain('Mob3')
    })
  })

  describe('deleteMob', () => {
    it('should not delete a living mob', () => {
      const mob = MobManager.createMob('TestMob', 'test.png')

      const deleted = MobManager.deleteMob(mob.id)

      expect(deleted).toBe(false)
      expect(MobManager.count()).toBe(1)
    })

    it('should delete a dead mob', () => {
      const mob = MobManager.createMob('TestMob', 'test.png')
      MobManager.damageMob(mob.id, 200)

      const deleted = MobManager.deleteMob(mob.id)

      expect(deleted).toBe(true)
      expect(MobManager.count()).toBe(0)
    })

    it('should return false for non-existing mob', () => {
      const deleted = MobManager.deleteMob('non-existent-id')

      expect(deleted).toBe(false)
    })
  })

  describe('damageMob', () => {
    it('should damage an existing mob', () => {
      const mob = MobManager.createMob('TestMob', 'test.png')

      const result = MobManager.damageMob(mob.id, 30)

      expect(result.success).toBe(true)
      expect(result.mob?.vie).toBe(70)
    })

    it('should return error=died when mob dies', () => {
      const mob = MobManager.createMob('TestMob', 'test.png')

      const result = MobManager.damageMob(mob.id, 150)

      expect(result.success).toBe(true)
      expect(result.error).toBe('died')
      expect(result.mob?.status).toBe('mort')
    })

    it('should return error for non-existing mob', () => {
      const result = MobManager.damageMob('non-existent-id', 20)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Mob non trouvé')
    })
  })

  describe('healMob', () => {
    it('should heal a living mob', () => {
      const mob = MobManager.createMob('TestMob', 'test.png')
      MobManager.damageMob(mob.id, 50)

      const result = MobManager.healMob(mob.id, 30)

      expect(result.success).toBe(true)
      expect(result.mob?.vie).toBe(80)
    })

    it('should not heal a dead mob', () => {
      const mob = MobManager.createMob('TestMob', 'test.png')
      MobManager.damageMob(mob.id, 200)

      const result = MobManager.healMob(mob.id, 50)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Le mob est mort')
    })

    it('should return error for non-existing mob', () => {
      const result = MobManager.healMob('non-existent-id', 20)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Mob non trouvé')
    })
  })

  describe('feedMob', () => {
    it('should feed a living mob', () => {
      const mob = MobManager.createMob('TestMob', 'test.png')

      const result = MobManager.feedMob(mob.id, 20)

      expect(result.success).toBe(true)
      expect(result.mob?.faim).toBe(0)
    })

    it('should not feed a dead mob', () => {
      const mob = MobManager.createMob('TestMob', 'test.png')
      MobManager.damageMob(mob.id, 200)

      const result = MobManager.feedMob(mob.id, 20)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Le mob est mort')
    })

    it('should return error for non-existing mob', () => {
      const result = MobManager.feedMob('non-existent-id', 20)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Mob non trouvé')
    })
  })

  describe('reviveMob', () => {
    it('should revive a dead mob', () => {
      const mob = MobManager.createMob('TestMob', 'test.png')
      MobManager.damageMob(mob.id, 200)

      const result = MobManager.reviveMob(mob.id)

      expect(result.success).toBe(true)
      expect(result.mob?.status).toBe('vivant')
      expect(result.mob?.vie).toBe(50)
    })

    it('should not revive a living mob', () => {
      const mob = MobManager.createMob('TestMob', 'test.png')

      const result = MobManager.reviveMob(mob.id)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Le mob est déjà vivant')
    })

    it('should return error for non-existing mob', () => {
      const result = MobManager.reviveMob('non-existent-id')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Mob non trouvé')
    })
  })

  describe('renameMob', () => {
    it('should rename a mob', () => {
      const mob = MobManager.createMob('OldName', 'test.png')

      const result = MobManager.renameMob(mob.id, 'NewName')

      expect(result.success).toBe(true)
      expect(result.mob?.nom).toBe('NewName')
    })

    it('should generate unique name if duplicate exists', () => {
      MobManager.createMob('ExistingName', 'test.png')
      const mob = MobManager.createMob('OldName', 'test.png')

      const result = MobManager.renameMob(mob.id, 'ExistingName')

      expect(result.success).toBe(true)
      expect(result.mob?.nom).toBe('ExistingName 2')
    })

    it('should return error for non-existing mob', () => {
      const result = MobManager.renameMob('non-existent-id', 'NewName')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Mob non trouvé')
    })
  })

  describe('clear', () => {
    it('should remove all mobs', () => {
      MobManager.createMob('Mob1', 'mob1.png')
      MobManager.createMob('Mob2', 'mob2.png')
      expect(MobManager.count()).toBe(2)

      MobManager.clear()

      expect(MobManager.count()).toBe(0)
      expect(MobManager.getAllMobs()).toEqual([])
    })
  })

  describe('count', () => {
    it('should return the number of mobs', () => {
      expect(MobManager.count()).toBe(0)

      MobManager.createMob('Mob1', 'mob1.png')
      expect(MobManager.count()).toBe(1)

      MobManager.createMob('Mob2', 'mob2.png')
      expect(MobManager.count()).toBe(2)

      const mob = MobManager.getAllMobs()[0]
      MobManager.damageMob(mob.id, 200)
      MobManager.deleteMob(mob.id)
      expect(MobManager.count()).toBe(1)
    })
  })
})

