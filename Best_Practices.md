# 🛠️ Best Practices: Architecture & Coding Style

After analyzing the codebase, here are several recommendations to improve scalability, maintainability, and security.

---

## 🏗️ Architecture Recommendations

### 1. Centralized Shared Types
**Current State**: `MobData` and `MobStatus` are defined separately in both Main and Renderer processes.
**Recommendation**: Create a `src/shared/types.ts` file and export interfaces from there. This ensures that both processes always stay in sync regarding data structures.

### 2. Event-Driven UI (Decoupling)
**Current State**: `Mob.ts` uses module-level variables like `onMobClickCallback` and `selectedMobRenderer`.
**Recommendation**: Use a simple **Event Bus** or a native `EventTarget` to handle selections and global events. This prevents "prop drilling" or reliance on global state in a way that's hard to test.

### 3. Component Extraction
**Current State**: `MobRenderer.ts` handles character stats, name renamin, AND movement logic.
**Recommendation**: Split the UI into smaller, specialized components:
- `StatBar`: A reusable class/function for rendering progress bars.
- `MobBehavior`: A class specifically for movement and "AI" logic.
- `MobView`: Specifically for the visual representation and DOM management.

### 4. Robust State Synchronization
**Current State**: The Renderer explicitly calls `updateFromData` after every IPC action.
**Recommendation**: Implement a **State Manager** (even a simple one) in the Renderer that listens for IPC updates and automatically triggers re-renders of affected components. This reduces the risk of missed updates if a new action is added.

---

## 🎨 Coding Style & Implementation

### 1. Modern DOM Management
**Current State**: Using `innerHTML` with template literals for the entire mob structure.
**Recommendation**: For complex components, prioritize `document.createElement()` or a library like `lit-html` if the project grows. For vanilla TS, updating only specific elements (e.g., `vieBar.style.width`) is better than re-writing the whole subtree.

### 2. Error Handling & Validation
**Current State**: Basic checks for `result.success`.
**Recommendation**: 
- **Main**: Add more robust validation for Mob names (e.g., max length, forbidden characters).
- **Renderer**: Use `try/catch` blocks around IPC calls to handle potential connection issues or crashes gracefully.

### 3. CSS Architecture
**Current State**: Using custom properties (CSS variables) for animations.
**Recommendation**: Standardize the use of CSS variables for colors, spacing, and timing. This makes "Dark Mode" or theming much easier to implement later.

---

## 🚀 Proposed Directory Structure

A more scalable structure would look like this:

```text
src/
├── main/
│   ├── services/    # Business logic (MobService)
│   ├── handlers/    # IPC registration
│   └── index.ts
├── shared/
│   └── types.ts     # Interfaces shared by both processes
└── renderer/
    ├── src/
    │   ├── components/ # Small UI units (StatBar, Button)
    │   ├── core/       # Managers (Sound, State)
    │   ├── entities/   # Domain objects (MobRenderer)
    │   └── main.ts
    └── assets/
```

---

*Prepared by Antigravity*
