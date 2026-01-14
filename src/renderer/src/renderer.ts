import {
  MobRenderer,
  getSelectedMob,
  setSelectedMob,
  setOnRenameCallback,
  setOnMobClick,
  setIsActionModeActive
} from './Mob'
import { MobData } from '../../shared/types'
import { preloadSounds } from './SoundManager'
import potatoImage from '../assets/Potato still.png'

// Map des renderers de mobs par ID
const mobRenderers: Map<string, MobRenderer> = new Map()

// Mode d'action actuel
type ActionMode = 'none' | 'damage' | 'heal' | 'feed' | 'revive'
let currentActionMode: ActionMode = 'none'

/**
 * Vérifie si un mode d'action est actif
 */
function isActionModeActive(): boolean {
  return currentActionMode !== 'none'
}

/**
 * Définit le mode d'action actuel
 */
function setActionMode(mode: ActionMode): void {
  currentActionMode = mode
  const mobContainer = document.getElementById('mob-container')
  const body = document.body

  // Retirer toutes les classes de mode précédentes
  body.classList.remove(
    'action-mode-damage',
    'action-mode-heal',
    'action-mode-feed',
    'action-mode-revive'
  )
  mobContainer?.classList.remove(
    'action-mode-damage',
    'action-mode-heal',
    'action-mode-feed',
    'action-mode-revive'
  )

  // Retirer la classe active de tous les boutons
  document.querySelectorAll('.action-btn').forEach((btn) => btn.classList.remove('active'))

  if (mode !== 'none') {
    body.classList.add(`action-mode-${mode}`)
    mobContainer?.classList.add(`action-mode-${mode}`)

    // Ajouter la classe active au bouton correspondant
    const activeBtn = document.getElementById(`btn-${mode}`)
    activeBtn?.classList.add('active')
  }
}

/**
 * Applique l'action actuelle sur un mob via IPC
 * Note: Les sons sont joués AVANT l'appel IPC pour éviter les problèmes d'autoplay policy
 */
async function applyActionToMob(mobRenderer: MobRenderer): Promise<void> {
  const id = mobRenderer.id

  switch (currentActionMode) {
    case 'damage': {
      // Jouer le son immédiatement (avant l'appel async)
      mobRenderer.playSoundEffect('punch')
      const result = await window.api.damageMob(id, 20)
      if (result.success && result.mob) {
        mobRenderer.updateFromData(result.mob)
        // Si le mob vient de mourir
        if (result.error === 'died') {
          setTimeout(() => mobRenderer.playSoundEffect('death'), 200)
        }
      }
      break
    }
    case 'heal': {
      mobRenderer.playSoundEffect('heal')
      const result = await window.api.healMob(id, 20)
      if (result.success && result.mob) {
        mobRenderer.updateFromData(result.mob)
      }
      break
    }
    case 'feed': {
      mobRenderer.playSoundEffect('feed')
      const result = await window.api.feedMob(id, 20)
      if (result.success && result.mob) {
        mobRenderer.updateFromData(result.mob)
      }
      break
    }
    case 'revive': {
      mobRenderer.playSoundEffect('revive')
      const result = await window.api.reviveMob(id)
      if (result.success && result.mob) {
        mobRenderer.updateFromData(result.mob)
      }
      break
    }
    default:
      // Pas de mode actif, juste sélectionner le mob
      setSelectedMob(mobRenderer)
  }
}

function init(): void {
  window.addEventListener('DOMContentLoaded', async () => {
    doAThing()
    await preloadSounds()
    setupRenameCallback()
    await initMobs()
    setupClickThrough()
    setupActionButtons()
    setupSaveLoadButtons()
    setupMobManagementButtons()
  })
}

/**
 * Configure le callback pour la validation des noms uniques lors du renommage via IPC
 */
function setupRenameCallback(): void {
  setOnRenameCallback(async (mobRenderer, newName) => {
    const result = await window.api.renameMob(mobRenderer.id, newName)
    if (result.success && result.mob) {
      return result.mob.nom
    }
    return mobRenderer.nom // Garder l'ancien nom en cas d'erreur
  })

  // Configurer le callback pour les clics sur les mobs
  setOnMobClick((mobRenderer) => {
    applyActionToMob(mobRenderer)
  })

  // Configurer le callback pour vérifier si une action est active
  setIsActionModeActive(() => {
    return isActionModeActive()
  })
}

function doAThing(): void {
  const ipcHandlerBtn = document.getElementById('ipcHandler')
  ipcHandlerBtn?.addEventListener('click', () => {
    window.electron.ipcRenderer.send('ping')
  })
}

async function initMobs(): Promise<void> {
  const mobContainer = document.getElementById('mob-container')
  if (!mobContainer) return

  // Essayer de charger la sauvegarde
  const loaded = await loadMobsOnStartup(mobContainer)

  // Si aucune sauvegarde n'existe, créer un mob par défaut
  if (!loaded) {
    const result = await window.api.createMob('Potato', potatoImage)
    if (result.success && result.mob) {
      const renderer = new MobRenderer(result.mob)
      renderer.render(mobContainer)
      mobRenderers.set(result.mob.id, renderer)

      // Sélectionner le premier mob par défaut
      setSelectedMob(renderer)
    }
  }
}

async function loadMobsOnStartup(mobContainer: HTMLElement): Promise<boolean> {
  const result = await window.api.loadMobs()
  if (!result.success || !result.mobs || result.mobs.length === 0) {
    console.log('Aucune sauvegarde trouvée, création des mobs par défaut')
    return false
  }

  try {
    // Créer les renderers à partir des données chargées
    result.mobs.forEach((data: MobData) => {
      // Utiliser l'image importée si c'est le même nom, sinon utiliser l'URL stockée
      const imageUrl = data.imageUrl.includes('Potato') ? potatoImage : data.imageUrl
      const renderer = new MobRenderer({ ...data, imageUrl })
      renderer.render(mobContainer)
      mobRenderers.set(data.id, renderer)
    })

    // Sélectionner le premier mob
    if (mobRenderers.size > 0) {
      const firstRenderer = mobRenderers.values().next().value
      if (firstRenderer) {
        setSelectedMob(firstRenderer)
      }
    }

    console.log('Sauvegarde chargée automatiquement:', mobRenderers.size, 'mob(s)')
    return true
  } catch (error) {
    console.error('Erreur au démarrage:', error)
    return false
  }
}

async function saveMobs(): Promise<void> {
  const result = await window.api.saveMobs()
  if (result.success) {
    console.log('Mobs sauvegardés avec succès dans:', result.path)
    showNotification('Sauvegarde réussie !', 'success')
  } else {
    console.error('Erreur de sauvegarde:', result.error)
    showNotification('Erreur de sauvegarde', 'error')
  }
}

async function loadMobs(): Promise<void> {
  const result = await window.api.loadMobs()
  if (!result.success || !result.mobs) {
    console.error('Erreur de chargement:', result.error)
    showNotification(result.error || 'Erreur de chargement', 'error')
    return
  }

  try {
    const mobContainer = document.getElementById('mob-container')
    if (!mobContainer) return

    // Supprimer les renderers existants
    mobRenderers.forEach((renderer) => renderer.destroy())
    mobRenderers.clear()
    setSelectedMob(null)

    // Créer les nouveaux renderers à partir des données chargées
    result.mobs.forEach((data: MobData) => {
      // Utiliser l'image importée si c'est le même nom, sinon utiliser l'URL stockée
      const imageUrl = data.imageUrl.includes('Potato') ? potatoImage : data.imageUrl
      const renderer = new MobRenderer({ ...data, imageUrl })
      renderer.render(mobContainer)
      mobRenderers.set(data.id, renderer)
    })

    // Sélectionner le premier mob
    if (mobRenderers.size > 0) {
      const firstRenderer = mobRenderers.values().next().value
      if (firstRenderer) {
        setSelectedMob(firstRenderer)
      }
    }

    console.log('Mobs chargés avec succès:', mobRenderers.size)
    showNotification('Chargement réussi !', 'success')
  } catch (error) {
    console.error('Erreur de parsing:', error)
    showNotification('Erreur de parsing des données', 'error')
  }
}

function showNotification(message: string, type: 'success' | 'error'): void {
  const notification = document.createElement('div')
  notification.className = `notification ${type}`
  notification.textContent = message
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-weight: bold;
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
    background: ${type === 'success' ? '#4caf50' : '#f44336'};
  `
  document.body.appendChild(notification)

  setTimeout(() => {
    notification.style.opacity = '0'
    notification.style.transition = 'opacity 0.3s'
    setTimeout(() => notification.remove(), 300)
  }, 2000)
}

function setupSaveLoadButtons(): void {
  const btnSave = document.getElementById('btn-save')
  const btnLoad = document.getElementById('btn-load')

  btnSave?.addEventListener('click', () => {
    saveMobs()
  })

  btnLoad?.addEventListener('click', () => {
    loadMobs()
  })
}

/**
 * Ajoute un nouveau mob via IPC
 */
async function addNewMob(): Promise<void> {
  const mobContainer = document.getElementById('mob-container')
  if (!mobContainer) return

  const result = await window.api.createMob('Nouveau Mob', potatoImage)
  if (result.success && result.mob) {
    const renderer = new MobRenderer(result.mob)
    renderer.render(mobContainer)
    mobRenderers.set(result.mob.id, renderer)

    // Sélectionner le nouveau mob
    setSelectedMob(renderer)

    showNotification(`${result.mob.nom} créé !`, 'success')
  } else {
    showNotification('Erreur lors de la création', 'error')
  }
}

/**
 * Supprime le mob sélectionné via IPC (seulement s'il est mort)
 */
async function deleteSelectedMob(): Promise<void> {
  const mobRenderer = getSelectedMob()
  if (!mobRenderer) {
    showNotification('Aucun mob sélectionné', 'error')
    return
  }

  if (mobRenderer.status !== 'mort') {
    showNotification('Le mob doit être mort pour être supprimé', 'error')
    return
  }

  const result = await window.api.deleteMob(mobRenderer.id)
  if (result.success) {
    // Retirer le renderer de la map
    mobRenderers.delete(mobRenderer.id)

    // Supprimer du DOM
    mobRenderer.destroy()

    // Sélectionner un autre mob si disponible
    if (mobRenderers.size > 0) {
      const firstRenderer = mobRenderers.values().next().value
      if (firstRenderer) {
        setSelectedMob(firstRenderer)
      }
    } else {
      setSelectedMob(null)
    }

    showNotification('Mob supprimé', 'success')
  } else {
    showNotification(result.error || 'Erreur lors de la suppression', 'error')
  }
}

/**
 * Configure les boutons d'ajout et de suppression de mobs
 */
function setupMobManagementButtons(): void {
  const btnAddMob = document.getElementById('btn-add-mob')
  const btnDeleteMob = document.getElementById('btn-delete-mob')

  btnAddMob?.addEventListener('click', () => {
    addNewMob()
  })

  btnDeleteMob?.addEventListener('click', () => {
    deleteSelectedMob()
  })
}

function setupClickThrough(): void {
  const mobContainer = document.getElementById('mob-container')
  const actionPanel = document.getElementById('action-panel')

  // Quand la souris entre sur le mob ou le panneau d'actions, désactiver le click-through
  const enableInteraction = (): void => {
    window.api.setIgnoreMouseEvents?.(false)
  }

  // Quand la souris quitte, réactiver le click-through
  const disableInteraction = (): void => {
    window.api.setIgnoreMouseEvents?.(true)
  }

  mobContainer?.addEventListener('mouseenter', enableInteraction)
  mobContainer?.addEventListener('mouseleave', disableInteraction)

  actionPanel?.addEventListener('mouseenter', enableInteraction)
  actionPanel?.addEventListener('mouseleave', disableInteraction)
}

function setupActionButtons(): void {
  const btnDamage = document.getElementById('btn-damage')
  const btnHeal = document.getElementById('btn-heal')
  const btnFeed = document.getElementById('btn-feed')
  const btnRevive = document.getElementById('btn-revive')

  // Fonction pour toggle un mode d'action
  const toggleActionMode = (mode: ActionMode): void => {
    if (currentActionMode === mode) {
      setActionMode('none')
    } else {
      setActionMode(mode)
    }
  }

  // Bouton Attaquer
  btnDamage?.addEventListener('click', () => {
    toggleActionMode('damage')
  })

  // Bouton Soigner
  btnHeal?.addEventListener('click', () => {
    toggleActionMode('heal')
  })

  // Bouton Nourrir
  btnFeed?.addEventListener('click', () => {
    toggleActionMode('feed')
  })

  // Bouton Réanimer
  btnRevive?.addEventListener('click', () => {
    toggleActionMode('revive')
  })

  // Désactiver le mode avec Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      setActionMode('none')
    }
  })
}

init()
