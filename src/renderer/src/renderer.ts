import { Mob, MobData, getSelectedMob, setSelectedMob } from './Mob'
import potatoImage from '../assets/Potato still.png'

// Liste de tous les mobs
let mobs: Mob[] = []

function init(): void {
  window.addEventListener('DOMContentLoaded', async () => {
    doAThing()
    await initMobs()
    setupClickThrough()
    setupActionButtons()
    setupSaveLoadButtons()
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

  // Bouton Attaquer - inflige 20 dégâts
  btnDamage?.addEventListener('click', () => {
    const mob = getSelectedMob()
    if (mob) {
      mob.takeDamage(20)
    }
  })

  // Bouton Soigner - soigne 20 PV
  btnHeal?.addEventListener('click', () => {
    const mob = getSelectedMob()
    if (mob) {
      mob.heal(20)
    }
  })

  // Bouton Nourrir - diminue la faim de 20
  btnFeed?.addEventListener('click', () => {
    const mob = getSelectedMob()
    if (mob) {
      mob.feed(20)
    }
  })

  // Bouton Réanimer - ressuscite le mob
  btnRevive?.addEventListener('click', () => {
    const mob = getSelectedMob()
    if (mob) {
      mob.revive()
    }
  })
}

init()
