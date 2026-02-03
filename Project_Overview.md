# 🚀 Project Overview: Electron Tamagotchi

This document provides a technical overview of the application, its features, architecture, and the libraries that power it.

---

## 📋 Features

### 🐾 Mob Management
- **Creation**: Generate new virtual creatures (Mobs) with unique names and default stats.
- **Persistence**: Save and load Mobs to/from a local JSON file (`mobs-save.json`).
- **Customization**: Rename Mobs and equip them with hats via the profile overlay.
- **Evolution**: Gain XP through combat to level up, unlocking stat points, weapons, and traits.

### ⚔️ Combat System
- **Real-time Arena**: Animated combat scene with HP bars, energy (ATB), and visual damage popups.
- **PvE Survival**: Challenging encounters where defeat means **Permadeath**.
- **Resurrection**: Dead mobs can only be revived using a **Potion de Réanimation** (5% drop chance in PvE).
- **Memorial**: A dedicated view to track and honor mobs that died permanently.
- **Arsenal & Mutations**: Equipment and genetic traits (max 6) that drastically affect combat logic.

### 🏺 Bocal (Physics Sandbox)
- **Matter-js Engine**: High-fidelity physics simulation for coins and items.
- **Merging**: Merge identical coins to reach higher denominations.
- **Atmospheric Effects**: Dynamic weather (rain, wind, snow) affecting the physics environment.

### 🎮 Visuals & Audio
- **Dynamic Rendering**: `MobDisplay.ts` handles complex layered Rendering (Skin + Base).
- **Advanced Animations**: Combat-specific animations (dash, hit, special moves).
- **Audio Scape**: Centralized `SoundManager.ts` managing contextual SFX.

---

## 🏗️ Architecture

The application follows the **Electron Process Model**, ensuring security and performance by separating system-level operations from the user interface.

### 1. Main Process (`src/main.ts`)
- **System Access**: Handles file system operations (saving/loading Mobs), window management, and native OS integrations.
- **Node.js Integration**: Has full access to Node.js APIs.

### 2. Preload Script (`src/preload.ts`)
- **Security Bridge**: Uses `contextBridge` to securely expose specific Main Process functionalities to the Renderer without exposing the entire Node.js environment.

### 3. Renderer Process (`src/renderer/`)
- **UI & Logic**: Built with TypeScript and Vite. Manages the DOM, CSS animations, and user interactions.
- **Mob Engine**: `Mob.ts` handles individual Mob AI, physics-lite movement, and rendering logic.
- **Sound Manager**: `SoundManager.ts` handles audio preloading and playback.

### 🔄 IPC Communication
Communication between processes happens via **Inter-Process Communication (IPC)**:
- **Renderer to Main**: Requests like `saveMobs` or `loadMobs`.
- **Main to Renderer**: Returning status updates or data payloads.

---

## 📚 External Libraries

| Library | Purpose |
|---------|---------|
| **[Electron](https://www.electronjs.org/)** | The core framework used to build the cross-platform desktop application using web technologies. |
| **[Vite](https://vitejs.dev/)** | High-performance build tool and development server for the frontend. |
| **[TypeScript](https://www.typescriptlang.org/)** | Adds static typing to JavaScript, improving code reliability and developer experience. |
| **[Electron-Vite](https://electron-vite.org/)** | Integrated build tool tailored specifically for Electron and Vite synchronization. |
| **[Jest](https://jestjs.io/)** | Testing framework used for unit and integration tests. |
| **[ESLint](https://eslint.org/)** & **[Prettier](https://prettier.io/)** | Linting and code formatting to maintain a clean and consistent codebase. |

---

*Last modified: January 2026*
