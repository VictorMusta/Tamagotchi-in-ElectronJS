# 🎮 Features - Tamagotchi in ElectronJS

Ce document liste toutes les fonctionnalités du jeu, les interactions possibles, les tests effectués et leurs effets.

---

## 📋 Table des matières

1. [Gestion des Mobs](#gestion-des-mobs)
2. [Actions sur les Mobs](#actions-sur-les-mobs)
3. [Système de Mode d'Action](#système-de-mode-daction)
4. [Mouvement et Animation](#mouvement-et-animation)
5. [Système de Sons](#système-de-sons)
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

## ⚔️ Actions sur les Mobs

### Attaquer (Damage)
| Élément | Description |
|---------|-------------|
| **Bouton** | 💥 (rouge) |
| **Effet** | Inflige **20 points de dégâts** au mob cliqué |
| **Test - Vie > 20** | La vie diminue de 20 |
| **Test - Vie ≤ 20** | La vie tombe à 0, le mob meurt |
| **Test - Mob mort** | Le mob devient grisé, arrête de bouger |

### Soigner (Heal)
| Élément | Description |
|---------|-------------|
| **Bouton** | ❤️ (rose) |
| **Effet** | Restaure **20 points de vie** au mob cliqué |
| **Maximum** | 100 PV |
| **Test - Mob vivant** | La vie augmente de 20 (max 100) |
| **Test - Mob mort** | Aucun effet (ne peut pas soigner un mort) |

### Nourrir (Feed)
| Élément | Description |
|---------|-------------|
| **Bouton** | 🍖 (orange) |
| **Effet** | Diminue la **faim de 20 points** |
| **Minimum** | 0 |
| **Test - Faim > 0** | La faim diminue de 20 (min 0) |
| **Test - Mob mort** | Aucun effet |

### Réanimer (Revive)
| Élément | Description |
|---------|-------------|
| **Bouton** | ⚡ (bleu) |
| **Effet** | Ressuscite le mob avec des stats réduites |
| **Stats après réanimation** | Vie: 50, Énergie: 50, Faim: 50 |
| **Test - Mob mort** | Le mob revient à la vie et recommence à sauter |
| **Test - Mob vivant** | Aucun effet |

---

## 🎯 Système de Mode d'Action

### Activation d'un mode
| Interaction | Effet |
|-------------|-------|
| Cliquer sur un bouton d'action | Active le mode correspondant |
| Re-cliquer sur le même bouton | Désactive le mode |
| Appuyer sur `Échap` | Désactive le mode actif |

### Curseurs personnalisés
| Mode | Curseur |
|------|---------|
| Damage | ❌ Croix rouge |
| Heal | ❤️ Cœur rose |
| Feed | 🍔 Burger orange |
| Revive | ⚡ Éclair bleu |

### Effets visuels
| État | Effet |
|------|-------|
| Bouton actif | Agrandi avec contour blanc lumineux |
| Survol mob en mode actif | Lueur colorée selon le mode |

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

## 🖥️ Interface Utilisateur

### Panneau d'actions
| Position | Description |
|----------|-------------|
| Localisation | Fixé en bas à droite de l'écran |
| Organisation | Boutons empilés verticalement avec séparateurs |

### Boutons disponibles
| Bouton | Couleur | Fonction |
|--------|---------|----------|
| ➕ | Cyan | Ajouter un mob |
| 🗑️ | Gris/Rouge | Supprimer un mob mort |
| 💥 | Rouge | Mode attaque |
| ❤️ | Rose | Mode soin |
| 🍔 | Orange | Mode nourrir |
| ⚡ | Bleu | Mode réanimer |
| 💾 | Vert | Sauvegarder |
| 📁 | Violet | Charger |

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
  nom: string        // Nom unique du mob
  imageUrl: string   // URL de l'image
  vie: number        // 0-100
  energie: number    // 0-100
  faim: number       // 0-100
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

*Dernière mise à jour : Décembre 2025*

