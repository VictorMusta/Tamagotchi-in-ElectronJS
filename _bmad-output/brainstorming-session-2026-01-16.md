---
title: 'Game Brainstorming Session'
date: '2026-01-16'
author: 'V.grabowski'
version: '1.0'
stepsCompleted: [1, 2, 3, 4]
status: 'completed'
---

# Game Brainstorming Session

## Session Info

- **Date:** 2026-01-16
- **Facilitator:** Game Designer Agent
- **Participant:** V.grabowski

---

_Ideas will be captured as we progress through the session._

## Brainstorming Approach

**Selected Mode:** Sélectif

**Techniques Disponibles :**
- **Framework MDA** (Mécaniques, Dynamiques, Esthétiques)
- **Player Fantasy** (L'aspiration du joueur)
- **Core Loop Design** (Boucle de gameplay centrale)
- **Genre Mashup** (Mélange de genres)
- **Emotion Mapping** (Ciblage émotionnel)
- **Design de Moments** (Moments clés)
- **Boîte à Contraintes** (Innovation par la limite)
- **Remix / Réadaptation** (Mutation de règles)

**Zones de Focus :**
- Boucle de gameplay moment-après-moment
- Fantaisie du joueur (Compagnon de barre des tâches)
- Expérience esthétique et émotionnelle
- Systèmes de progression et persistance

---

## 🚀 Phase d'Idéation : Boucle de Gameplay Centrale (Core Loop)

**Objectif :** Définir le "battement de cœur" de Potato Rotato. Qu'est-ce que le joueur fait de manière répétitive et pourquoi est-ce satisfaisant ?

### Focus actuel : La Motivation (Pourquoi revenir ?)
L'utilisateur a choisi de se concentrer sur les raisons qui poussent à l'interaction régulière avec la patate sur la barre des tâches.

**[Catégorie #1]**: Trésors de la Taskbar
_Core Loop_: La patate "creuse" dans les icônes de la barre des tâches pendant que l'utilisateur travaille. Toutes les X heures, elle déterre un objet (chapeau, pièce, nourriture rare) que le joueur doit cliquer pour collecter.
_Nouveauté_: Utilisation de l'espace de la barre des tâches comme une "mine" interactive.

---

## 🔍 Elicitation Avancée : Le "Biome de la Taskbar" (Fusion Evolution + Jardin)

**Concept Consolidé :** La patate n'évolue pas seule ; elle est liée à son environnement. En s'occupant d'elle, l'utilisateur débloque des éléments de "mobilier" (plantes, accessoires de bureau miniature) qui agrandissent le biome de la barre des tâches.

### 🛠️ Points de réflexion technique (Deep Dive) :
1. **Rendu de l'Espace** : Comment placer les éléments du jardin (fleurs, tentes) sans masquer les icônes actives de l'utilisateur ? 
   - _Piste_ : Utiliser des coordonnées relatives aux icônes système ou créer un "fond" transparent derrière les icônes.
2. **Mécanique de "Catch-up"** : Que se passe-t-il si l'utilisateur ne se connecte pas pendant 2 jours ?
   - _Piste_ : Le jardin peut "s'assécher" visuellement (couleurs plus ternes), demandant un "grand arrosage" pour revenir à la normale.
3. **Synergie Evolution/Jardin** :
   - _Piste_ : La patate débloque des "capacités de jardinier". Ex: Au stade "Ado", elle peut arroser 2 plantes à la fois. Au stade "Royal", elle fait apparaître un arc-en-ciel sur la barre des tâches après 4h de travail productif (mode Pomodoro).

### ✅ Décisions Finales de Design :
- **Expansion Verticale** : Le jardin peut s'élever au-dessus de la barre des tâches (arbres qui poussent) en utilisant une zone de fenêtre plus haute.
- **Persistance Différenciée** : 
  - Les **Mobs** (patates) restent mobiles et "volatiles".
  - L'**Environnement** (arbres, décorations) est fixe et sauvegardé séparément via un bouton dédié. Leur emplacement est persistant entre les sessions.
- **Philosophie Zen** : Pas de bonus de stats via le jardin. C'est un pur plaisir visuel et une preuve de progression/soin du joueur.

---

## 🏁 Clôture de la Session (Step 4 of 4)

**Résumé des piliers de Potato Rotato :**
1. **Compagnon de Barre des Tâches** : Fenêtre transparente intégrée sur le bureau.
2. **Biome Persistant** : Un jardin qui pousse en hauteur (arbres) et dont l'aménagement est sauvegardé via un bouton dédié. Contrairement aux patates, ces éléments sont fixes et immuables au chargement.
3. **Évolution Liée au Soin** : La patate grandit et débloque de nouveaux éléments de biome.
4. **Logique d'Interaction** : Feedback sonore/visuel intelligent et persistance du temps (catch-up logic).

## 📝 Résumé de la Session

### Concept le plus prometteur : Le Biome Evolutif de la Taskbar
Ce concept transforme la barre des tâches en un petit écosystème vivant. Ce qui le rend unique, c'est la verticalité (les arbres qui dépassent de la barre) et la dualité entre les patates "volatiles" et le décor "permanent".

### Points Clés
- **Verticalité** : Utilisation de l'espace au-dessus de la barre des tâches.
- **Persistance** : Sauvegarde manuelle et automatique de l'emplacement des arbres/objets.
- **Zénitude** : Pas de statistiques complexes liées au décor, pur plaisir visuel.

### Prochaines Étapes Recommandées
1. **Mise à jour du PRD** : Intégrer la gestion de la persistance de l'environnement.
2. **Mise à jour de l'Architecture** : Définir le schéma de données pour les éléments de biome.
3. **Prototypage de la Fenêtre** : Tester la transparence et le rendu "au-dessus" de la barre des tâches.

---

## Session Complete

**Date:** 2026-01-16
**Participant:** V.grabowski
**Status:** Complete
**Steps Completed:** [1, 2, 3, 4]
