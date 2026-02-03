# 🤌 potato_rotato 🤌

<div align="center">

![Electron](https://img.shields.io/badge/Electron-39.x-47848F?style=for-the-badge&logo=electron&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**Un adorable Tamagotchi de bureau avec des patates qui sautent !** 🥔

[Télécharger](#-installation) • [Fonctionnalités](#-fonctionnalités) • [Développement](#-développement) • [Contribution](#-contribution)

</div>

---

## 📖 Description

**potato_rotato** est une application de bureau construite avec Electron qui vous permet d'avoir des petites créatures (patates) comme compagnons sur votre écran. Prenez soin d'elles, nourrissez-les, soignez-les, et regardez-les sauter joyeusement sur votre bureau !

### ✨ Points forts

- 🖥️ **Fenêtre transparente** - Les mobs se baladent directement sur votre bureau
- 🎮 **Interactions multiples** - Nourrir, soigner, attaquer, réanimer
- 💾 **Sauvegarde automatique** - Vos mobs sont persistés entre les sessions
- 🔊 **Effets sonores** - Chaque action a son propre son
- 🏗️ **Architecture IPC** - Logique métier séparée (main) et rendu (renderer)

---

## 🚀 Installation

### Téléchargement

Rendez-vous sur la page [Releases](../../releases) et téléchargez la version correspondant à votre système :

| Plateforme | Fichier |
|------------|---------|
| Windows (Installateur) | `potato_rotato-x.x.x-setup.exe` |
| Windows (Portable) | `potato_rotato-x.x.x-portable.zip` |
| Linux (AppImage) | `potato_rotato-x.x.x.AppImage` |
| Linux (Debian/Ubuntu) | `potato_rotato_x.x.x_amd64.deb` |

### Installation Linux

```bash
# AppImage
chmod +x potato_rotato-*.AppImage
./potato_rotato-*.AppImage

# Debian/Ubuntu
sudo dpkg -i potato_rotato_*_amd64.deb
```

---

## 🎮 Fonctionnalités

### Gestion des Mobs
| Action | Description |
|--------|-------------|
| ➕ **Créer** | Ajoute une nouvelle patate (Hub) |
| 🗑️ **Supprimer** | Supprime un mob mort (Hub) |
| ✏️ **Renommer** | Éditez le nom depuis le profil |
| 👕 **Customiser** | Changez le chapeau dans le profil |

### ⚔️ Boucle de Gameplay & Combat
- **Hub de Bureau** : Gérez votre équipe, personnalisez vos patates et lancez des activités.
- **Duel (BASTON)** : Mode PvP local entre deux patates de votre équipe.
- **PvE & Survie** : Affrontez des ennemis de plus en plus forts. 
  - ⚠️ **Mort Permanente** : Si une patate perd en PvE, elle meurt définitivement.
  - 🧪 **Potions** : Utilisez une Potion de Réanimation pour sauver une patate tombée au combat.
  - 🏛️ **Mémorial** : Honorez vos compagnons tombés au combat dans la section dédiée.
- **Progression** : Gagnez de l'XP pour monter de niveau et débloquer des Stats, Armes et Mutations.

### 🏺 Le Bocal (Mode Physique)
- Simulation basée sur **Matter-js** où vos économies deviennent des pièces physiques.
- **Fusion** : Atteignez des dénominations supérieures en fusionnant vos pièces.
- **Météo** : Le vent et la pluie influencent la physique interne du bocal.

### Système de sauvegarde
- 💾 **Persistance** : Vos patates, leur arsenal et leur progression sont sauvegardés localement.
- 🔄 **Auto-load** : Tout est restauré automatiquement au lancement de l'application.

---

## 💻 Développement

### Prérequis

- [Node.js](https://nodejs.org/) (v18+)
- npm ou yarn

### Installation

```bash
# Cloner le projet
git clone https://github.com/votre-username/potato_rotato.git
cd potato_rotato

# Installer les dépendances
npm install
```

### Commandes

```bash
# Mode développement (hot-reload)
npm run dev

# Vérification TypeScript
npm run typecheck

# Linting
npm run lint

# Formatage du code
npm run format

# Tests unitaires
npm run test

# Tests en mode watch
npm run test:watch

# Tests avec couverture de code
npm run test:coverage

# Build de production
npm run build

# Build pour Windows
npm run build:win

# Build pour Linux
npm run build:linux

# Build pour macOS
npm run build:mac
```

### Tests

Le projet inclut des tests unitaires pour toutes les fonctionnalités principales :

```
tests/
├── setup.ts              # Configuration et mocks Electron
├── Mob.test.ts           # Tests de la classe Mob
├── MobManager.test.ts    # Tests du gestionnaire de mobs
└── ipcHandlers.test.ts   # Tests des handlers IPC
```

#### Couverture des tests

| Module | Fonctionnalités testées |
|--------|------------------------|
| **Mob** | Constructeur, takeDamage, heal, feed, revive, rename, setEnergie, setFaim, toJSON, fromJSON |
| **MobManager** | createMob, deleteMob, getMobById, getAllMobs, damageMob, healMob, feedMob, reviveMob, renameMob, clear, count |
| **IPC Handlers** | Tous les handlers (mob:create, mob:delete, mob:damage, etc.) |

### Architecture

```
src/
├── main/                 # Processus principal (Backend Electron)
│   ├── MobModel.ts       # Logique métier et stats des patates
│   ├── MobService.ts     # CRUD et gestion de la collection
│   ├── PveService.ts     # Gestion des combats PvE
│   └── TournamentService.ts # Logique des tournois
├── preload/              # Pont sécurisé (Bridge IPC)
│   └── index.ts          # Exposition des fonctions au Renderer
└── renderer/             # Interface utilisateur (Frontend Vite/TS)
    ├── src/
    │   ├── combat/       # UI et Moteur de combat
    │   ├── physics/      # Intégration Matter-js (Bocal)
    │   ├── mob/          # Animations et comportements visuels
    │   ├── renderer.ts   # Point d'entrée UI
    │   └── WebApi.ts     # Wrapper pour les appels IPC
```

### Communication IPC

Le projet utilise une architecture IPC pour séparer la logique métier du rendu :

```
┌─────────────────────┐       IPC        ┌──────────────────────┐
│     Renderer        │ ◄───────────────► │       Main           │
│  (Affichage/UI)     │                   │  (Logique métier)    │
│                     │  mob:damage       │                      │
│  - MobRenderer      │  mob:heal         │  - MobService        │
│  - Animations       │  mob:feed         │  - MobManager        │
│  - Sons             │  mob:revive       │  - Persistance       │
└─────────────────────┘                   └──────────────────────┘
```

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Voici comment participer :

### Signaler un bug

1. Vérifiez que le bug n'a pas déjà été signalé dans les [Issues](../../issues)
2. Ouvrez une nouvelle issue avec :
   - Description claire du problème
   - Étapes pour reproduire
   - Comportement attendu vs observé
   - Captures d'écran si applicable
   - Votre OS et version de l'app

### Proposer une fonctionnalité

1. Ouvrez une issue avec le tag `enhancement`
2. Décrivez la fonctionnalité souhaitée
3. Expliquez pourquoi elle serait utile

### Soumettre du code

1. **Fork** le projet
2. **Créez** une branche pour votre fonctionnalité
   ```bash
   git checkout -b feature/ma-super-fonctionnalite
   ```
3. **Commitez** vos changements
   ```bash
   git commit -m "feat: ajoute ma super fonctionnalité"
   ```
4. **Poussez** sur votre fork
   ```bash
   git push origin feature/ma-super-fonctionnalite
   ```
5. Ouvrez une **Pull Request**

### Convention de commits

Ce projet utilise [Conventional Commits](https://www.conventionalcommits.org/) :

| Type | Description |
|------|-------------|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `docs` | Documentation |
| `style` | Formatage (pas de changement de code) |
| `refactor` | Refactorisation |
| `test` | Ajout/modification de tests |
| `chore` | Maintenance |

### Standards de code

- Utilisez TypeScript strict
- Formatez avec Prettier (`npm run format`)
- Passez le linting (`npm run lint`)
- Assurez-vous que le build fonctionne (`npm run build`)

---

## 📄 License

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

## 🙏 Remerciements

- [Electron](https://www.electronjs.org/) - Framework desktop
- [electron-vite](https://electron-vite.org/) - Build tool
- [electron-builder](https://www.electron.build/) - Packaging

---

<div align="center">

**Fait avec ❤️ et des 🥔**

</div>
