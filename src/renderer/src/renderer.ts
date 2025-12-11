import { Mob, MobData, getSelectedMob, setSelectedMob, setOnRenameCallback, setOnMobClick, setIsActionModeActive } from './Mob'
import potatoImage from '../assets/Potato still.png'

// Liste de tous les mobs
let mobs: Mob[] = []

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
 * Génère un nom unique en ajoutant un numéro incrémental si nécessaire
 */
function getUniqueName(baseName: string, excludeMob?: Mob): string {
  let name = baseName
  let counter = 2

  while (mobs.some((m) => m !== excludeMob && m.nom === name)) {
    name = `${baseName} ${counter}`
    counter++
  }

  return name
}

/**
 * Définit le mode d'action actuel
 */
function setActionMode(mode: ActionMode): void {
  currentActionMode = mode
  const mobContainer = document.getElementById('mob-container')
  const body = document.body

  // Retirer toutes les classes de mode précédentes
  body.classList.remove('action-mode-damage', 'action-mode-heal', 'action-mode-feed', 'action-mode-revive')
  mobContainer?.classList.remove('action-mode-damage', 'action-mode-heal', 'action-mode-feed', 'action-mode-revive')

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
 * Applique l'action actuelle sur un mob
 */
function applyActionToMob(mob: Mob): void {
  switch (currentActionMode) {
    case 'damage':
      mob.takeDamage(20)
      break
    case 'heal':
      mob.heal(20)
      break
    case 'feed':
      mob.feed(20)
      break
    case 'revive':
      mob.revive()
      break
    default:
      // Pas de mode actif, juste sélectionner le mob
      setSelectedMob(mob)
  }
}

function init(): void {
  window.addEventListener('DOMContentLoaded', async () => {
    doAThing()
    setupRenameCallback()
    await initMobs()
    setupClickThrough()
    setupActionButtons()
    setupSaveLoadButtons()
    setupMobManagementButtons()
  })
}

/**
 * Configure le callback pour la validation des noms uniques lors du renommage
 */
function setupRenameCallback(): void {
  setOnRenameCallback((mob, newName) => {
    return getUniqueName(newName, mob)
  })

  // Configurer le callback pour les clics sur les mobs
  setOnMobClick((mob) => {
    applyActionToMob(mob)
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
    const potato = new Mob('Potato', potatoImage, 100, 80, 20)
    potato.render(mobContainer)
    mobs.push(potato)

    // Sélectionner le premier mob par défaut
    setSelectedMob(potato)

    // Exemple: exposer le mob pour des tests dans la console
    ;(window as unknown as { mob: Mob }).mob = potato
  }
}

async function loadMobsOnStartup(mobContainer: HTMLElement): Promise<boolean> {
  const result = await window.api.loadMobs()
  if (!result.success || !result.data) {
    console.log('Aucune sauvegarde trouvée, création des mobs par défaut')
    return false
  }

  try {
    const mobsData: MobData[] = JSON.parse(result.data)
    if (mobsData.length === 0) {
      return false
    }

    // Créer les mobs à partir des données chargées
    mobsData.forEach((data) => {
      // Utiliser l'image importée si c'est le même nom, sinon utiliser l'URL stockée
      const imageUrl = data.imageUrl.includes('Potato') ? potatoImage : data.imageUrl
      const mob = Mob.fromJSON({ ...data, imageUrl })
      mob.render(mobContainer)
      mobs.push(mob)
    })

    // Sélectionner le premier mob
    if (mobs.length > 0) {
      setSelectedMob(mobs[0])
      ;(window as unknown as { mob: Mob }).mob = mobs[0]
    }

    console.log('Sauvegarde chargée automatiquement:', mobs.length, 'mob(s)')
    return true
  } catch (error) {
    console.error('Erreur de parsing au démarrage:', error)
    return false
  }
}

async function saveMobs(): Promise<void> {
  const mobsData: MobData[] = mobs.map((mob) => mob.toJSON())
  const jsonString = JSON.stringify(mobsData, null, 2)

  const result = await window.api.saveMobs(jsonString)
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
  if (!result.success || !result.data) {
    console.error('Erreur de chargement:', result.error)
    showNotification(result.error || 'Erreur de chargement', 'error')
    return
  }

  try {
    const mobsData: MobData[] = JSON.parse(result.data)
    const mobContainer = document.getElementById('mob-container')
    if (!mobContainer) return

    // Supprimer les mobs existants
    mobs.forEach((mob) => mob.destroy())
    mobs = []
    setSelectedMob(null)

    // Créer les nouveaux mobs à partir des données chargées
    mobsData.forEach((data) => {
      // Utiliser l'image importée si c'est le même nom, sinon utiliser l'URL stockée
      const imageUrl = data.imageUrl.includes('Potato') ? potatoImage : data.imageUrl
      const mob = Mob.fromJSON({ ...data, imageUrl })
      mob.render(mobContainer)
      mobs.push(mob)
    })

    // Sélectionner le premier mob
    if (mobs.length > 0) {
      setSelectedMob(mobs[0])
    }

    console.log('Mobs chargés avec succès:', mobs.length)
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
 * Ajoute un nouveau mob avec un nom unique
 */
function addNewMob(): void {
  const mobContainer = document.getElementById('mob-container')
  if (!mobContainer) return

  const uniqueName = getUniqueName('Nouveau Mob')
  const newMob = new Mob(uniqueName, potatoImage, 100, 100, 0)
  newMob.render(mobContainer)
  mobs.push(newMob)

  // Sélectionner le nouveau mob
  setSelectedMob(newMob)

  showNotification(`${uniqueName} créé !`, 'success')
}

/**
 * Supprime le mob sélectionné (seulement s'il est mort)
 */
function deleteSelectedMob(): void {
  const mob = getSelectedMob()
  if (!mob) {
    showNotification('Aucun mob sélectionné', 'error')
    return
  }

  if (mob.status !== 'mort') {
    showNotification('Le mob doit être mort pour être supprimé', 'error')
    return
  }

  // Retirer le mob de la liste
  const index = mobs.indexOf(mob)
  if (index > -1) {
    mobs.splice(index, 1)
  }

  // Supprimer du DOM
  mob.destroy()

  // Sélectionner un autre mob si disponible
  if (mobs.length > 0) {
    setSelectedMob(mobs[0])
  } else {
    setSelectedMob(null)
  }

  showNotification('Mob supprimé', 'success')
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
