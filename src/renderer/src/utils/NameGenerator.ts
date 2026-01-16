// Générateur de noms aléatoires pour les mobs
// Combine un adjectif et un nom d'animal

const ADJECTIVES = [
    'Rapide', 'Lent', 'Brave', 'Timide', 'Majestueux', 'Grincheux',
    'Joyeux', 'Rusé', 'Noble', 'Sauvage', 'Doux', 'Féroce',
    'Sage', 'Fou', 'Élégant', 'Bizarre', 'Mystérieux', 'Radieux',
    'Sombre', 'Lumineux', 'Puissant', 'Fragile', 'Vaillant', 'Paresseux',
    'Agile', 'Lourd', 'Petit', 'Grand', 'Ancien', 'Jeune'
]

const ANIMALS = [
    'Renard', 'Loup', 'Ours', 'Aigle', 'Tigre', 'Lion',
    'Panda', 'Dragon', 'Phénix', 'Serpent', 'Faucon', 'Corbeau',
    'Lynx', 'Panthère', 'Léopard', 'Jaguar', 'Coyote', 'Raton',
    'Castor', 'Loutre', 'Blaireau', 'Écureuil', 'Lapin', 'Cerf',
    'Sanglier', 'Bison', 'Buffle', 'Chameau', 'Gecko', 'Caméléon'
]

/**
 * Génère un nom aléatoire en combinant un adjectif et un nom d'animal
 * Format: "Adjectif Animal" (ex: "Rapide Renard", "Sage Dragon")
 */
export function generateRandomName(): string {
    const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
    return `${adjective} ${animal}`
}

/**
 * Génère plusieurs noms aléatoires uniques
 */
export function generateRandomNames(count: number): string[] {
    const names = new Set<string>()
    let attempts = 0
    const maxAttempts = count * 10 // Éviter les boucles infinies

    while (names.size < count && attempts < maxAttempts) {
        names.add(generateRandomName())
        attempts++
    }

    return Array.from(names)
}
