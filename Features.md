# 🎮 Features - Tamagotchi in ElectronJS

Ce document liste toutes les fonctionnalités du jeu, les interactions possibles, les tests effectués et leurs effets.

---

## 📋 Table des matières

1. [Gestion des Mobs](#gestion-des-mobs)
2. [Système de Combat (PvP & Tournois)](#système-de-combat-pvp--tournois)
3. [PvE & Mode Survie](#pve--mode-survie)
4. [Mouvement et Animation](#mouvement-et-animation)
5. [Le Bocal (Mode Physique)](#le-bocal-mode-physique)
6. [Sauvegarde et Chargement](#sauvegarde-et-chargement)
7. [Interface Utilisateur](#interface-utilisateur)

---

## 🐾 Gestion des Mobs

### Créer un nouveau mob
| Élément | Description |
|---------|-------------|
| **Bouton** | `+` (cyan) dans le panneau d'actions |
| **Action** | Cliquer sur le bouton |
| **Effet** | Crée un nouveau mob nommé "Nouveau Mob" avec des stats par défaut |
| **Stats initiales** | Vie: 100, Énergie: 100, Faim: 0 |
| **Position** | Aléatoire sur la largeur de l'écran |
| **Test** | Si le nom existe déjà, un numéro incrémental est ajouté ("Nouveau Mob 2", "Nouveau Mob 3", etc.) |

### Supprimer un mob
| Élément | Description |
|---------|-------------|
| **Bouton** | 🗑️ (gris → rouge au hover) dans le panneau d'actions |
| **Action** | Cliquer sur le bouton |
| **Condition** | Le mob doit être **mort** pour être supprimé |
| **Effet** | Supprime le mob sélectionné du jeu |
| **Test - Mob vivant** | Affiche une notification d'erreur "Le mob doit être mort pour être supprimé" |
| **Test - Mob mort** | Le mob est supprimé, un autre mob est automatiquement sélectionné |
| **Test - Aucun mob** | Affiche "Aucun mob sélectionné" |

### Renommer un mob
| Élément | Description |
|---------|-------------|
| **Interaction** | Double-clic sur l'image du mob (sans action sélectionnée) OU double-clic sur le nom dans le tooltip |
| **Effet** | Ouvre un champ de saisie pour modifier le nom |
| **Validation** | Appuyer sur `Entrée` ou cliquer ailleurs |
| **Annulation** | Appuyer sur `Échap` |
| **Test - Nom existant** | Un numéro incrémental est ajouté automatiquement |
| **Test - Pendant renommage** | Le mob arrête de sauter et reste immobile |

### Sélectionner un mob
| Élément | Description |
|---------|-------------|
| **Interaction** | Cliquer sur un mob (sans action sélectionnée) |
| **Effet** | Le mob devient sélectionné (lueur cyan) |
| **Affichage** | Le tooltip reste affiché sur le mob sélectionné |

---

## ⚔️ Système de Combat (PvP & Tournois)

### 🥊 Duel (BASTON)
- **Déclencheur** : Bouton `BASTON !` dans le Hub.
- **Principe** : Combat au tour par tour (système ATB) entre deux patates de votre équipe.
- **Armes** : Chaque arme possède des stats propres (Dégâts, Block, Stun, Counter).
- **Victoire** : Gain de 50 XP. Les deux patates sont soignées après le duel (Safe Zone).

### 🏆 Tournois
- **Condition** : Minimum 8 patates dans l'équipe.
- **Déroulement** : Tableau de tournoi automatique.
- **Progression** : Gagnez des badges et des skins (ex: Couronne) pour le grand gagnant.

---

## 💀 PvE & Mode Survie

### ⚔️ Combats Sauvages
- **Déclencheur** : Bouton `Exploration PvE` (Cible).
- **Difficulté** : Ennemis générés avec des niveaux progressifs.
- **Récompenses** : XP et 5% de chance de trouver une **Potion de Réanimation**.

### ⚠️ Permadeath (Mort Permanente)
- **Défaite** : Si votre patate tombe à 0 PV en PvE, elle est marquée comme morte.
- **Mémorial** : Une patate morte en PvE rejoint le mémorial et quitte définitivement l'équipe active.

### 🧪 Résurrection (Potions)
- **Action** : En cas de défaite, si vous possédez une **Potion de Réanimation**, vous pouvez l'utiliser pour annuler la mort et reprendre le combat à 100% PV.
- **Stock** : Les potions ne peuvent être obtenues qu'en gagnant des combats PvE.

---

## 🦘 Mouvement et Animation

### Comportement autonome
| Paramètre | Valeur |
|-----------|--------|
| Réflexion nouvelle destination | Toutes les 2-5 secondes |
| Probabilité de bouger | 70% |
| Distance de déplacement | 100-400 pixels |

### Animation de saut
| Paramètre | Valeur |
|-----------|--------|
| Hauteur du saut | 100-300 pixels (aléatoire) |
| Distance par saut | 20-45 pixels |
| Durée du saut | 0.5-0.8 secondes |
| Délai entre sauts | 3-10 secondes |
| Effet | Squash & stretch (compression/étirement) |

### Direction
| Comportement | Effet |
|--------------|-------|
| Mouvement vers la gauche | L'image se retourne horizontalement |
| Mouvement vers la droite | L'image est normale |

### États spéciaux
| État | Comportement |
|------|--------------|
| Mob mort | Arrête de bouger, image grisée à 50% d'opacité |
| En cours de renommage | Arrête de sauter temporairement |
| Après réanimation | Recommence à sauter |

---

## 🔊 Système de Sons

### Sons disponibles
| Action | Fichier | Déclencheur |
|--------|---------|-------------|
| Punch | `placeholder_punch.mp3` | Quand on inflige des dégâts à un mob |
| Heal | `placeholder_heal.mp3` | Quand on soigne un mob |
| Feed | `placeholder_feed.mp3` | Quand on nourrit un mob |
| Death | `placeholder_death.mp3` | Quand un mob meurt (après le son de punch) |
| Revive | `placeholder_revive.mp3` | Quand on réanime un mob |

### Emplacement des fichiers
| Chemin | Description |
|--------|-------------|
| `src/renderer/assets/sounds/` | Dossier contenant tous les fichiers audio |

### Personnalisation
Pour personnaliser les sons, remplacez les fichiers `placeholder_*.mp3` par vos propres fichiers audio en gardant les mêmes noms.

### Paramètres audio
| Paramètre | Valeur |
|-----------|--------|
| Volume par défaut | 50% |
| Format supporté | MP3, WAV, OGG |
| Préchargement | Au démarrage de l'application |

---

## 💾 Sauvegarde et Chargement

### Sauvegarder
| Élément | Description |
|---------|-------------|
| **Bouton** | 💾 (vert) |
| **Action** | Cliquer sur le bouton |
| **Données sauvegardées** | Nom, image, vie, énergie, faim, statut de chaque mob |
| **Fichier** | `mobs-save.json` dans le dossier userData de l'application |
| **Notification** | "Sauvegarde réussie !" (vert) |

### Charger
| Élément | Description |
|---------|-------------|
| **Bouton** | 📁 (violet) |
| **Action** | Cliquer sur le bouton |
| **Effet** | Remplace tous les mobs actuels par ceux de la sauvegarde |
| **Test - Sauvegarde existante** | Les mobs sont restaurés avec leur état |
| **Test - Aucune sauvegarde** | Affiche "Aucune sauvegarde trouvée" |
| **Notification succès** | "Chargement réussi !" (vert) |

### Chargement automatique
| Comportement | Description |
|--------------|-------------|
| Au démarrage | L'application essaie de charger automatiquement la dernière sauvegarde |
| Si sauvegarde existe | Les mobs sont restaurés silencieusement |
| Si aucune sauvegarde | Un mob "Potato" par défaut est créé |

---

### Panneau d'actions
| Position | Description |
|----------|-------------|
| Localisation | Fixé en bas à droite de l'écran |
| Organisation | Boutons empilés verticalement avec séparateurs |

### Boutons disponibles
| Bouton | Couleur | Fonction |
|--------|---------|----------|
| ➕ | Cyan | Ajouter un mob |
| 🗑️ | Gris/Rouge | Supprimer un mob |
| 🥊 | Rouge | Mode BASTON (PvP Local) |
| 🎯 | Bleu | Mode PvE (Survie) |
| 🏺 | Orange | Accéder au Bocal |
| 🏛️ | Gris | Mémorial |
| 💾 | Vert | Sauvegarder les données |
| 📁 | Violet | Charger la sauvegarde |

### Tooltip du mob
| Élément | Description |
|---------|-------------|
| Affichage | Au survol du mob OU toujours visible si sélectionné |
| Contenu | Nom, statut (vivant/mort), barres de vie/énergie/faim |
| Position | Au-dessus de l'image du mob |

### Notifications
| Type | Couleur | Durée |
|------|---------|-------|
| Succès | Vert | 2 secondes |
| Erreur | Rouge | 2 secondes |
| Animation | Glissement depuis la droite |

### Statistiques du mob
| Stat | Barre de couleur | Description |
|------|------------------|-------------|
| Vie | Rouge → Vert | Points de vie (0-100) |
| Énergie | Orange → Jaune | Niveau d'énergie (0-100) |
| Faim | Vert → Orange | Niveau de faim (0-100, 0 = pas faim) |

---

## ⌨️ Raccourcis clavier

| Touche | Action |
|--------|--------|
| `Échap` | Désactiver le mode d'action actif |
| `Échap` (pendant renommage) | Annuler le renommage |
| `Entrée` (pendant renommage) | Valider le renommage |

---

## 🔧 Informations techniques

### Structure des données d'un Mob
```typescript
interface MobData {
  id: string
  nom: string
  imageUrl: string
  vie: number
  stats: {
    force: number
    vitalite: number
    vitesse: number
    agilite: number
  }
  level: number
  experience: number
  statPoints: number
  traits: string[]
  skin: { hat: string }
  weapons: string[]
  status: 'vivant' | 'mort'
}
```

### Fichiers principaux
| Fichier | Rôle |
|---------|------|
| `Mob.ts` | Classe Mob et gestion des comportements |
| `renderer.ts` | Logique principale, gestion des modes d'action |
| `SoundManager.ts` | Gestionnaire de sons (lecture, préchargement, volume) |
| `main.css` | Styles, animations, curseurs personnalisés |
| `index.html` | Structure HTML et boutons d'action |
| `index.ts` (main) | Process principal Electron, sauvegarde/chargement fichiers |
| `index.ts` (preload) | API exposées au renderer |

---

*Dernière mise à jour : Février 2026*

