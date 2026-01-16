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
import { BiomeRenderer } from '../renderer/src/BiomeRenderer'
import { CombatUI } from '../renderer/src/combat/CombatUI'
import { generateRandomName } from '../renderer/src/utils/NameGenerator'
import potatoImage from '../renderer/assets/Potato still.png'

// Utiliser l'API web
const api = new WebPlatformAPI()

// Map des renderers de mobs par ID
const mobRenderers: Map<string, MobRenderer> = new Map()

// Initialisation du biome
const biomeRenderer = new BiomeRenderer('biome-container')

// Initialisation du système de combat (UI)
const combatUI = new CombatUI()

// Mode d'action actuel
type ActionMode = 'none' | 'damage' | 'heal' | 'revive'
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
        'action-mode-revive'
    )
    mobContainer?.classList.remove(
        'action-mode-damage',
        'action-mode-heal',
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
            const result = await api.healMob(id, 20)
            if (result.success && result.mob) {
                if (result.changed) mobRenderer.playSoundEffect('heal')
                mobRenderer.updateFromData(result.mob)
            }
            break
        }
        case 'revive': {
            const result = await api.reviveMob(id)
            if (result.success && result.mob) {
                if (result.changed) mobRenderer.playSoundEffect('revive')
                mobRenderer.updateFromData(result.mob)
            }
            break
        }
        default:
            setSelectedMob(mobRenderer)
    }
}

async function init(): Promise<void> {
    window.addEventListener('DOMContentLoaded', async () => {
        await preloadSounds().catch(e => console.error('[Web] Sound preload failed:', e))
        setupRenameCallback()
        await initMobs().catch(e => console.error('[Web] Mob init failed:', e))
        await initBiome().catch(e => console.error('[Web] Biome init failed:', e))
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
    const btnSaveBiome = document.getElementById('btn-save-biome')

    btnSave?.addEventListener('click', () => {
        saveMobs()
    })

    btnLoad?.addEventListener('click', () => {
        loadMobs()
    })

    btnSaveBiome?.addEventListener('click', () => {
        saveBiome()
    })
}

async function initBiome(): Promise<void> {
    const result = await api.loadBiome()
    if (result.success && result.data) {
        biomeRenderer.setObjects(result.data)
    } else {
        biomeRenderer.addObject('tree', 200)
        biomeRenderer.addObject('flower', 400)
        biomeRenderer.addObject('tree', 600)
    }

    setInterval(() => {
        biomeRenderer.growTrees()
    }, 30000)
}

async function saveBiome(): Promise<void> {
    const data = biomeRenderer.getObjects()
    const result = await api.saveBiome(data)
    if (result.success) {
        showNotification('Biome sauvegardé !', 'success')
    } else {
        showNotification('Erreur sauvegarde biome', 'error')
    }
}

async function addNewMob(): Promise<void> {
    const mobContainer = document.getElementById('mob-container')
    if (!mobContainer) return

    const randomName = generateRandomName()
    const result = await api.createMob(randomName, potatoImage)
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
    const btnRevive = document.getElementById('btn-revive')
    const btnCombat = document.getElementById('btn-combat')

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

    btnRevive?.addEventListener('click', () => {
        toggleActionMode('revive')
    })

    btnCombat?.addEventListener('click', () => {
        showNotification('Ouverture du menu BASTON...', 'success')
        combatUI.showSelectionMenu((f1, f2) => {
            if (!f1.stats || !f2.stats) {
                showNotification('Erreur: Stats de mob manquantes', 'error');
                return;
            }
            combatUI.renderCombatScene(f1, f2, async (winner, loser) => {
                const result = await api.processCombatResult(winner, loser)
                if (result.reward) {
                    showNotification(`🏆 RÉCOMPENSE : ${result.reward} !`, 'success')
                }
                await api.saveMobs()
                loadMobs()
            })
        })
    })

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            setActionMode('none')
        }
    })
}

init()
