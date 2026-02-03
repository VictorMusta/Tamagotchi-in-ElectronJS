
export interface TraitDefinition {
    description: string
    effect?: string
    stats?: string
}

export const TRAIT_DEFINITIONS: Record<string, TraitDefinition> = {
    // Traits Implémentés
    'Appel de l\'Astico-Roi': {
        description: "Invoque un fidèle compagnon asticot.",
        effect: "L'asticot a sa propre barre d'action et attaque indépendamment.",
        stats: "Vitesse: 40% du maître | Dégâts: 5-10"
    },
    'Coup Critique': {
        description: "Maîtrise l'art de frapper les points vitaux.",
        effect: "Augmente drastiquement les chances de coup critique.",
        stats: "Crit Chance: 33% (vs 10%) | Crit Dmg: x2"
    },
    'Sprint Final': {
        description: "Une poussée d'adrénaline aux portes de la mort.",
        effect: "La vitesse double lorsque les PV sont critiques.",
        stats: "Speed x2 si PV < 20%"
    },
    'Peau de Cuir': {
        description: "Une peau tannée qui encaisse mieux les chocs.",
        effect: "Réduit tous les dégâts subis de toutes sources.",
        stats: "Réduction dégâts: -10%"
    },
    'Contre-attaque': {
        description: "L'art de retourner la force de l'adversaire contre lui.",
        effect: "L'esquive ou l'encaissement d'un coup peut déclencher une riposte.",
        stats: "Chance: 10% (Per Hit) | Dégâts: 100%"
    },
    'Berzerk': {
        description: "La douleur nourrit sa rage.",
        effect: "Après 3 coups subis consécutifs, déchaîne une furie de coups.",
        stats: "Furie: 2 hits (70% DMG) si 3 hits reçus"
    },
    'Essaim de Moucherons': {
        description: "Une nuée d'insectes qui harcèle l'adversaire.",
        effect: "Attaque très souvent pour peu de dégâts, mais peut aveugler la cible.",
        stats: "Vitesse: 150% | Dégâts: 2-3 | Aveuglement: 30% (-5 Agilité)"
    },
    'Gardien de Racine': {
        description: "Un petit golem de bois qui intercepte les coups.",
        effect: "Absorbe une partie des dégâts reçus par le maître tant qu'il a des PV.",
        stats: "Interception: 15% | PV: 50% du Maître"
    },
    'Esprit Saboteur': {
        description: "Un esprit malicieux qui s'en prend à l'équipement.",
        effect: "Tente de désarmer ou d'embrouiller l'adversaire régulièrement. Inflige des dégâts si sabotage impossible.",
        stats: "Vitesse: 150% | Swap arme: Garanti | Drop arme: 50% | Slap: 2-3 DMG"
    }
}
