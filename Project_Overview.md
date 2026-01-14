# 🚀 Project Overview: Electron Tamagotchi

This document provides a technical overview of the application, its features, architecture, and the libraries that power it.

---

## 📋 Features

### 🐾 Mob Management
- **Creation**: Generate new virtual creatures (Mobs) with unique names and default stats.
- **Persistence**: Save and load Mobs to/from a local JSON file (`mobs-save.json`), including automatic loading on startup.
- **Customization**: Rename Mobs via double-click and identify them with unique icons.
- **Selection**: Interactive selection system with visual highlighting.

### ⚔️ Interactive Actions
- **Damage (💥)**: Reduce Mob health; lethal damage results in Mob death.
- **Heal (❤️)**: Restore Mob health (up to 100%).
- **Feed (🍖)**: Reduce Mob hunger levels.
- **Revive (⚡)**: Resurrect dead Mobs with partial health and energy.
- **Action Modes**: Dedicated cursors and UI feedback for each interaction mode.

### 🎮 Visuals & Audio
- **Animations**: Dynamic "squash & stretch" jumping animations and horizontal flipping based on movement direction.
- **Feedback**: Color-coded stat bars (Life, Hunger, Energy) and real-time notifications.
- **Sound System**: Spatial-aware audio triggers for all interactions (punch, heal, feed, death, revive).

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
