export interface WeaponDef {
    id: string
    name: string
    type: 'short' | 'long' | 'shield'
    animationType: 'pierce' | 'slash' | 'impact'
    damageBonus: number
    statBonus?: { stat: string, amount: number }
    effects?: {
        stunChance?: number
        blockChance?: number // Reduce damage
        counterChance?: number // Range advantage
    }
    description: string
    icon: string
}

export const WEAPON_REGISTRY: Record<string, WeaponDef> = {
    'Cure-dent': {
        id: 'cure_dent',
        name: 'Cure-dent',
        type: 'short',
        animationType: 'pierce',
        damageBonus: 2,
        description: "Court portée. Rapide mais risqué face à une fourchette.",
        icon: 'toothpick.png'
    },
    'Fourchette': {
        id: 'fourchette',
        name: 'Fourchette',
        type: 'long',
        animationType: 'pierce',
        damageBonus: 4,
        description: "Longue portée. Idéal pour garder les cure-dents à distance.",
        icon: 'fork.png',
        effects: {
            counterChance: 0.25 // 25% chance to counter short weapons
        }
    },
    'Capsule': {
        id: 'capsule',
        name: 'Capsule',
        type: 'shield',
        animationType: 'impact', // Used for Bash/Block
        damageBonus: 1,
        statBonus: { stat: 'vitalite', amount: 5 },
        description: "Bouclier improvisé. Peut étourdir l'ennemi.",
        icon: 'cap.png',
        effects: {
            blockChance: 0.30, // 30% chance to reduce damage
            stunChance: 0.15   // 15% chance to stun on impact
        }
    },
    'Cutter': {
        id: 'cutter',
        name: 'Cutter',
        type: 'short',
        animationType: 'slash',
        damageBonus: 7,
        description: "Lame tranchante. Dégâts élevés.",
        icon: 'cutter.png'
    }
}

export function getWeaponDef(name?: string): WeaponDef | null {
    if (!name) return null
    return WEAPON_REGISTRY[name] || null
}
