---
title: 'Patate Combat - Brainstorming Session'
date: '2026-01-16'
author: 'V.grabowski'
version: '1.0'
stepsCompleted: [1, 2]
status: 'in-progress'
---

# Patate Combat - Brainstorming Session

## Session Info

- **Date:** 2026-01-16
- **Facilitator:** Game Designer Agent
- **Participant:** V.grabowski

---

## 6. Synthèse des Mécaniques (Version Validée)

### Statistiques de Combat
- **Force (FOR)** : Détermine les dégâts bruts infligés par coup.
- **Vitesse (VIT)** : Détermine le gain de "points d'action" dans la queue de combat. Permet de doubler les tours.
- **Agilité (AGI)** : Détermine la chance d'esquiver (vs Agilité adverse) et la précision.

### Système de Combat "Timeline Tick"
Le combat n'est pas un tour par tour classique mais une **Accumulation de Vitesse** :
1. Chaque "Tick", les deux patates gagnent des points d'action proportionnels à leur **Vitesse**.
2. Dès qu'une patate atteint le seuil (ex: 100 pts), elle effectue son action.
3. Si une patate est beaucoup plus rapide, elle peut agir 2 ou 3 fois avant que l'autre ne réagisse.

### Arsenal & Compagnons
- **Compagnons** : Les **Asticots** (Maggots) aident au combat avec des attaques aléatoires.
- **Armes (Objets Humains)** : Fourchette, cure-dent, câble USB, couteau, allumette, cuillère, dé à coudre.
- **Comportement** : Comme La Brute, elles peuvent être dégainées, perdues ou cassées au hasard.

### Mort Permanente & Réanimation
- **Mort Définitve** : En dehors des tests, une patate perdue en combat ne revient pas...
- **Fioles de Réanimation** : Un objet rare gagné après une série de **5 victoires d'affilée**. Permet de ramener une patate à la vie.

### Flow de Combat "BASTON !"
1. **Déclencheur** : Bouton "BASTON!" dans l'interface principale.
2. **Sélection** : Ouverture d'un menu de sélection affichant les stats, armes et capacités de chaque patate.
3. **Validation** : Choix de 2 patates et clic sur "Fight!".
4. **Scène de Combat** : Les patates se placent aux bords de l'écran.
5. **Déroulement** : Automatisé via la "Timeline Tick", un par un, jusqu'à la mort de l'une des deux.

### Profil RPG & Cosmétiques (Détails)
- **Menu** : Apparaît au double-clic.
- **Visualisation** : Patate zoomée.
- **Layers** : Customisation du **Chapeau** et du **Bas**.
- **Infos** : Stats de combat (FOR, VIT, AGI), Traits et Historique.

---

## 7. Idées de Mutations (Adaptées aux Stats)

1. **Sprint Final** : Gain de Vitesse massif quand les PV sont < 30%.
2. **Peau de Cuir** : Réduit les dégâts de Force de 25%.
3. **Contre-attaque** : Après une esquive (Agilité), 50% de chance de rendre un coup gratuit.
4. **Appel de l'Astico-Roi** : Le compagnon asticot attaque deux fois plus souvent.
5. **Main de Dentelle** : Moins de chance de laisser tomber son arme humaine.
6. **Berzerk** : Plus la vitesse est haute, plus la force augmente (synergie).

---

## 4. Idées Générées

**[Category #1]**: Auto-Brawl "Taskbar Arena"
_Core Loop_: Deux patates se font face sur la barre des tâches. Elles échangent des coups automatiquement en fonction de leur initiative et de leurs capacités jusqu'à ce que l'une tombe à 0 PV.
_Novelty_: Le combat se déroule directement "dans le décor" (biome), utilisant les emojis comme projectiles ou effets visuels.

**[Category #2]**: Mutations de Patate (Traits)
_Core Loop_: À la naissance, chaque patate reçoit 3 traits parmi une large liste (ex: "Peau de Patate Épaisse" pour la défense, "Oeil de Lynx" pour la précision). Ces traits définissent le style de combat.
_Novelty_: Les traits ne sont pas que des stats, ils peuvent changer l'interaction (ex: "Ami des Fleurs" fait qu'une fleur du biome soigne la patate pendant le combat).

**[Category #3]**: L'Arsenal Imprévisible
_Core Loop_: Pendant le combat, une patate peut "sortir" un objet au hasard (Frite, Fourchette, Beurre). L'objet peut être utilisé, raté, ou cassé.
_Novelty_: Les objets sont des "Skins" visuels qui apparaissent dynamiquement sur le sprite de la patate.

**[Category #4]**: Page de Profil "Identité Secrète"
_Core Loop_: Un double-clic ouvre un panneau stylisé affichant l'historique des combats (Victoires/Défaites), les 3 traits, et les statistiques de base.
_Novelty_: La page de profil est une "carte d'identité" exportable ou partageable visuellement.

---

## 5. Thèmes et Patterns Emergents

- **Le "Spectacle du Chaos"** : Le plaisir vient de voir comment les traits interagissent de manière imprévue.
- **L'Attachement par la Stat** : On s'attache à une patate car elle a un "Roll" de traits unique et puissant.

---
