import { Mob, MobData } from '../src/main/MobService'

describe('Mob', () => {
  describe('Constructor', () => {
    it('should create a mob with default values', () => {
      const mob = new Mob('TestMob', 'test.png')

      expect(mob.nom).toBe('TestMob')
      expect(mob.imageUrl).toBe('test.png')
      expect(mob.vie).toBe(100)
      expect(mob.energie).toBe(100)
      expect(mob.faim).toBe(0)
      expect(mob.status).toBe('vivant')
      expect(mob.id).toBeDefined()
    })

    it('should create a mob with custom values', () => {
      const mob = new Mob('CustomMob', 'custom.png', 50, 75, 25)

      expect(mob.vie).toBe(50)
      expect(mob.energie).toBe(75)
      expect(mob.faim).toBe(25)
      expect(mob.status).toBe('vivant')
    })

    it('should create a dead mob if vie is 0', () => {
      const mob = new Mob('DeadMob', 'dead.png', 0)

      expect(mob.vie).toBe(0)
      expect(mob.status).toBe('mort')
    })

    it('should use provided id if given', () => {
      const customId = 'custom-uuid-123'
      const mob = new Mob('TestMob', 'test.png', 100, 100, 0, customId)

      expect(mob.id).toBe(customId)
    })
  })

  describe('takeDamage', () => {
    it('should reduce vie by the damage amount', () => {
      const mob = new Mob('TestMob', 'test.png', 100)

      mob.takeDamage(20)

      expect(mob.vie).toBe(80)
      expect(mob.status).toBe('vivant')
    })

    it('should not reduce vie below 0', () => {
      const mob = new Mob('TestMob', 'test.png', 30)

      mob.takeDamage(50)

      expect(mob.vie).toBe(0)
      expect(mob.status).toBe('mort')
    })

    it('should return true if mob just died', () => {
      const mob = new Mob('TestMob', 'test.png', 20)

      const justDied = mob.takeDamage(30)

      expect(justDied).toBe(true)
      expect(mob.status).toBe('mort')
    })

    it('should return false if mob was already dead', () => {
      const mob = new Mob('TestMob', 'test.png', 0)

      const justDied = mob.takeDamage(20)

      expect(justDied).toBe(false)
    })

    it('should return false if mob is still alive', () => {
      const mob = new Mob('TestMob', 'test.png', 100)

      const justDied = mob.takeDamage(20)

      expect(justDied).toBe(false)
      expect(mob.status).toBe('vivant')
    })
  })

  describe('heal', () => {
    it('should increase vie by the heal amount', () => {
      const mob = new Mob('TestMob', 'test.png', 50)

      const healed = mob.heal(20)

      expect(healed).toBe(true)
      expect(mob.vie).toBe(70)
    })

    it('should not increase vie above 100', () => {
      const mob = new Mob('TestMob', 'test.png', 90)

      mob.heal(30)

      expect(mob.vie).toBe(100)
    })

    it('should not heal a dead mob', () => {
      const mob = new Mob('TestMob', 'test.png', 0)

      const healed = mob.heal(50)

      expect(healed).toBe(false)
      expect(mob.vie).toBe(0)
      expect(mob.status).toBe('mort')
    })
  })

  describe('feed', () => {
    it('should reduce faim by the feed amount', () => {
      const mob = new Mob('TestMob', 'test.png', 100, 100, 50)

      const fed = mob.feed(20)

      expect(fed).toBe(true)
      expect(mob.faim).toBe(30)
    })

    it('should not reduce faim below 0', () => {
      const mob = new Mob('TestMob', 'test.png', 100, 100, 10)

      mob.feed(30)

      expect(mob.faim).toBe(0)
    })

    it('should not feed a dead mob', () => {
      const mob = new Mob('TestMob', 'test.png', 0, 100, 50)

      const fed = mob.feed(20)

      expect(fed).toBe(false)
      expect(mob.faim).toBe(50)
    })
  })

  describe('revive', () => {
    it('should revive a dead mob with 50% stats', () => {
      const mob = new Mob('TestMob', 'test.png', 0, 0, 100)

      const revived = mob.revive()

      expect(revived).toBe(true)
      expect(mob.vie).toBe(50)
      expect(mob.energie).toBe(50)
      expect(mob.faim).toBe(50)
      expect(mob.status).toBe('vivant')
    })

    it('should not revive an already alive mob', () => {
      const mob = new Mob('TestMob', 'test.png', 100)

      const revived = mob.revive()

      expect(revived).toBe(false)
      expect(mob.vie).toBe(100)
    })
  })

  describe('rename', () => {
    it('should rename the mob', () => {
      const mob = new Mob('OldName', 'test.png')

      mob.rename('NewName')

      expect(mob.nom).toBe('NewName')
    })
  })

  describe('setEnergie', () => {
    it('should set energie value', () => {
      const mob = new Mob('TestMob', 'test.png')

      mob.setEnergie(75)

      expect(mob.energie).toBe(75)
    })

    it('should clamp energie between 0 and 100', () => {
      const mob = new Mob('TestMob', 'test.png')

      mob.setEnergie(150)
      expect(mob.energie).toBe(100)

      mob.setEnergie(-20)
      expect(mob.energie).toBe(0)
    })
  })

  describe('setFaim', () => {
    it('should set faim value', () => {
      const mob = new Mob('TestMob', 'test.png')

      mob.setFaim(60)

      expect(mob.faim).toBe(60)
    })

    it('should clamp faim between 0 and 100', () => {
      const mob = new Mob('TestMob', 'test.png')

      mob.setFaim(150)
      expect(mob.faim).toBe(100)

      mob.setFaim(-20)
      expect(mob.faim).toBe(0)
    })
  })

  describe('toJSON', () => {
    it('should return a serializable object', () => {
      const mob = new Mob('TestMob', 'test.png', 80, 70, 30, 'test-id')

      const json = mob.toJSON()

      expect(json).toEqual({
        id: 'test-id',
        nom: 'TestMob',
        imageUrl: 'test.png',
        vie: 80,
        energie: 70,
        faim: 30,
        status: 'vivant'
      })
    })
  })

  describe('fromJSON', () => {
    it('should create a mob from JSON data', () => {
      const data: MobData = {
        id: 'json-id',
        nom: 'JsonMob',
        imageUrl: 'json.png',
        vie: 60,
        energie: 80,
        faim: 20,
        status: 'vivant'
      }

      const mob = Mob.fromJSON(data)

      expect(mob.id).toBe('json-id')
      expect(mob.nom).toBe('JsonMob')
      expect(mob.imageUrl).toBe('json.png')
      expect(mob.vie).toBe(60)
      expect(mob.energie).toBe(80)
      expect(mob.faim).toBe(20)
      expect(mob.status).toBe('vivant')
    })

    it('should preserve dead status from JSON', () => {
      const data: MobData = {
        id: 'dead-id',
        nom: 'DeadMob',
        imageUrl: 'dead.png',
        vie: 0,
        energie: 0,
        faim: 100,
        status: 'mort'
      }

      const mob = Mob.fromJSON(data)

      expect(mob.status).toBe('mort')
    })
  })
})

