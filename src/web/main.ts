import {
    MobRenderer,
    getSelectedMob,
    setSelectedMob,
    setOnRenameCallback,
    setOnMobClick,
    setIsActionModeActive
} from '../renderer/src/Mob'
import { MobData } from '../shared/types'
import { preloadSounds } from '../renderer/src/SoundManager'
import { WebPlatformAPI } from './WebPlatformAPI'
import potatoImage from '../renderer/assets/Potato still.png'

// Utiliser l'API web
const api = new WebPlatformAPI()

// Map des renderers de mobs par ID
const mobRenderers: Map<string, MobRenderer> = new Map()

// Mode d'action actuel
type ActionMode = 'none' | 'damage' | 'heal' | 'feed' | 'revive'
let currentActionMode: ActionMode = 'none'

function isActionModeActive(): boolean {
    return currentActionMode !== 'none'
}

function setActionMode(mode: ActionMode): void {
    currentActionMode = mode
    const mobContainer = document.getElementById('mob-container')
    const body = document.body

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

    document.querySelectorAll('.action-btn').forEach((btn) => btn.classList.remove('active'))

    if (mode !== 'none') {
        body.classList.add(`action-mode-${mode}`)
        mobContainer?.classList.add(`action-mode-${mode}`)

        const activeBtn = document.getElementById(`btn-${mode}`)
        activeBtn?.classList.add('active')
    }
}

async function applyActionToMob(mobRenderer: MobRenderer): Promise<void> {
    const id = mobRenderer.id

    switch (currentActionMode) {
        case 'damage': {
            mobRenderer.playSoundEffect('punch')
            const result = await api.damageMob(id, 20)
            if (result.success && result.mob) {
                mobRenderer.updateFromData(result.mob)
                if (result.error === 'died') {
                    setTimeout(() => mobRenderer.playSoundEffect('death'), 200)
                }
            }
            break
        }
        case 'heal': {
            mobRenderer.playSoundEffect('heal')
            const result = await api.healMob(id, 20)
            if (result.success && result.mob) {
                mobRenderer.updateFromData(result.mob)
            }
            break
        }
        case 'feed': {
            mobRenderer.playSoundEffect('feed')
            const result = await api.feedMob(id, 20)
            if (result.success && result.mob) {
                mobRenderer.updateFromData(result.mob)
            }
            break
        }
        case 'revive': {
            mobRenderer.playSoundEffect('revive')
            const result = await api.reviveMob(id)
            if (result.success && result.mob) {
                mobRenderer.updateFromData(result.mob)
            }
            break
        }
        default:
            setSelectedMob(mobRenderer)
    }
}

function init(): void {
    window.addEventListener('DOMContentLoaded', async () => {
        await preloadSounds()
        setupRenameCallback()
        await initMobs()
        setupActionButtons()
        setupSaveLoadButtons()
        setupMobManagementButtons()
    })
}

function setupRenameCallback(): void {
    setOnRenameCallback(async (mobRenderer, newName) => {
        const result = await api.renameMob(mobRenderer.id, newName)
        if (result.success && result.mob) {
            return result.mob.nom
        }
        return mobRenderer.nom
    })

    setOnMobClick((mobRenderer) => {
        applyActionToMob(mobRenderer)
    })

    setIsActionModeActive(() => {
        return isActionModeActive()
    })
}

async function initMobs(): Promise<void> {
    const mobContainer = document.getElementById('mob-container')
    if (!mobContainer) return

    const loaded = await loadMobsOnStartup(mobContainer)

    if (!loaded) {
        const result = await api.createMob('Potato', potatoImage)
        if (result.success && result.mob) {
            const renderer = new MobRenderer(result.mob)
            renderer.render(mobContainer)
            mobRenderers.set(result.mob.id, renderer)
            setSelectedMob(renderer)
        }
    }
}

async function loadMobsOnStartup(mobContainer: HTMLElement): Promise<boolean> {
    const result = await api.loadMobs()
    if (!result.success || !result.mobs || result.mobs.length === 0) {
        console.log('Aucune sauvegarde trouvée, création des mobs par défaut')
        return false
    }

    try {
        result.mobs.forEach((data: MobData) => {
            const imageUrl = data.imageUrl.includes('Potato') ? potatoImage : data.imageUrl
            const renderer = new MobRenderer({ ...data, imageUrl })
            renderer.render(mobContainer)
            mobRenderers.set(data.id, renderer)
        })

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
    const result = await api.saveMobs()
    if (result.success) {
        console.log('Mobs sauvegardés avec succès')
        showNotification('Sauvegarde réussie !', 'success')
    } else {
        console.error('Erreur de sauvegarde:', result.error)
        showNotification('Erreur de sauvegarde', 'error')
    }
}

async function loadMobs(): Promise<void> {
    const result = await api.loadMobs()
    if (!result.success || !result.mobs) {
        console.error('Erreur de chargement:', result.error)
        showNotification(result.error || 'Erreur de chargement', 'error')
        return
    }

    try {
        const mobContainer = document.getElementById('mob-container')
        if (!mobContainer) return

        mobRenderers.forEach((renderer) => renderer.destroy())
        mobRenderers.clear()
        setSelectedMob(null)

        result.mobs.forEach((data: MobData) => {
            const imageUrl = data.imageUrl.includes('Potato') ? potatoImage : data.imageUrl
            const renderer = new MobRenderer({ ...data, imageUrl })
            renderer.render(mobContainer)
            mobRenderers.set(data.id, renderer)
        })

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
    document.body.appendChild(notification)

    setTimeout(() => {
        notification.style.opacity = '0'
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

async function addNewMob(): Promise<void> {
    const mobContainer = document.getElementById('mob-container')
    if (!mobContainer) return

    const result = await api.createMob('Nouveau Mob', potatoImage)
    if (result.success && result.mob) {
        const renderer = new MobRenderer(result.mob)
        renderer.render(mobContainer)
        mobRenderers.set(result.mob.id, renderer)
        setSelectedMob(renderer)
        showNotification(`${result.mob.nom} créé !`, 'success')
    } else {
        showNotification('Erreur lors de la création', 'error')
    }
}

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

    const result = await api.deleteMob(mobRenderer.id)
    if (result.success) {
        mobRenderers.delete(mobRenderer.id)
        mobRenderer.destroy()

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

function setupActionButtons(): void {
    const btnDamage = document.getElementById('btn-damage')
    const btnHeal = document.getElementById('btn-heal')
    const btnFeed = document.getElementById('btn-feed')
    const btnRevive = document.getElementById('btn-revive')

    const toggleActionMode = (mode: ActionMode): void => {
        if (currentActionMode === mode) {
            setActionMode('none')
        } else {
            setActionMode(mode)
        }
    }

    btnDamage?.addEventListener('click', () => {
        toggleActionMode('damage')
    })

    btnHeal?.addEventListener('click', () => {
        toggleActionMode('heal')
    })

    btnFeed?.addEventListener('click', () => {
        toggleActionMode('feed')
    })

    btnRevive?.addEventListener('click', () => {
        toggleActionMode('revive')
    })

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            setActionMode('none')
        }
    })
}

init()
