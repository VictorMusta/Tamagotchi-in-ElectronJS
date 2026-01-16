
export interface TraitDefinition {
    description: string
    effect?: string
    stats?: string
}

export const TRAIT_DEFINITIONS: Record<string, TraitDefinition> = {
    // Traits Implémentés
    'Appel de l\'Astico-Roi': {
        description: "Invoque un compagnon asticot pour mordre l'adversaire.",
        effect: "30% de chance d'attaque bonus par tour.",
        stats: "Dégâts: 5-10 (Brut)"
    },
    'Coup Critique': {
        description: "Maîtrise l'art de frapper les points vitaux.",
        effect: "Augmente les chances de critique.",
        stats: "Crit Chance: 33% (vs 10%) | Crit Dmg: x2"
    },

    // Traits Cosmétiques / En Dev
    'Sprint Final': {
        description: "Une accélération soudaine lorsque la victoire est proche.",
        effect: "En attente d'implémentation.",
    },
    'Peau de Cuir': {
        description: "Une résistance accrue aux coups.",
        effect: "En attente d'implémentation (Réduction dégâts).",
    },
    'Contre-attaque': {
        description: "Riposter après avoir subi une attaque.",
        effect: "En attente d'implémentation.",
    },
    'Main de Dentelle': {
        description: "Une touche délicate... peut-être trop ?",
        effect: "En attente d'implémentation.",
    },
    'Berzerk': {
        description: "Une rage incontrôlable.",
        effect: "En attente d'implémentation (Dégâts ↑ si PV ↓).",
    }
}
