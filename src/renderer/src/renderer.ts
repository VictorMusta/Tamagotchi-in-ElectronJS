import { BiomeRenderer } from './BiomeRenderer'
import { ProfileRenderer } from './ProfileRenderer'
import { CombatUI } from './combat/CombatUI'
import { MobData } from '../../shared/types'
import { preloadSounds } from './SoundManager'
import { generateRandomName } from './utils/NameGenerator'
import { TournamentUI } from './tournament/TournamentUI'
import { TournamentManager } from '../../shared/TournamentManager'
import {
  MobRenderer,
  getSelectedMob,
  setSelectedMob,
  setOnRenameCallback,
  setOnMobClick,
  setOnProfileOpen
} from './Mob'
import potatoImage from '../assets/Potato still.png'

// Map des renderers de mobs par ID
const mobRenderers: Map<string, MobRenderer> = new Map()

// Initialisation du biome
const biomeRenderer = new BiomeRenderer('biome-container')

// Initialisation du renderer de profil
const profileRenderer = new ProfileRenderer()

// Initialisation du système de combat (UI)
const combatUI = new CombatUI()

// Initialisation du système de tournoi (UI) - Sera fait dans init()
let tournamentUI: TournamentUI



async function applyActionToMob(mobRenderer: MobRenderer): Promise<void> {
  // Pas de mode actif, juste sélectionner le mob
  setSelectedMob(mobRenderer)
}

async function init(): Promise<void> {
  console.log('[Renderer] Initializing...')

  try {
    // 1. UI Setup (Directly, independent of data)
    tournamentUI = new TournamentUI()
    doAThing()
    setupActionButtons()
    setupWindowControls()
    setupSaveLoadButtons()
    setupMobManagementButtons()
    setupRenameCallback()
    console.log('[Renderer] UI Setup complete')

    // 2. Data/Content Setup (Async)
    await preloadSounds().catch(e => console.error('[Renderer] Sound preload failed:', e))
    await initMobs().catch(e => console.error('[Renderer] Mob init failed:', e))
    await initBiome().catch(e => console.error('[Renderer] Biome init failed:', e))

    // 3. System Setup
    console.log('[Renderer] Initialization finished successfully')
  } catch (error) {
    console.error('[Renderer] CRITICAL INITIALIZATION ERROR:', error)
    showNotification('Erreur critique pendant l\'initialisation', 'error')
  }
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


  // Configurer le callback pour ouvrir le profil
  setOnProfileOpen(async (mobRenderer) => {
    // Recharger les données fraîches depuis le main process
    const result = await window.api.getMobById(mobRenderer.id)
    if (result.success && result.mob) {
      profileRenderer.render(result.mob, () => {
        // Optionnel: refresh si besoin à la fermeture
      }, (mobId, updatedMob) => {
        console.log('[Renderer] Mob renamed:', mobId, updatedMob.nom)
        // Update the mobRenderer that opened this profile
        mobRenderer.updateFromData(updatedMob)
      })
    }
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
      // Sécurité sur imageUrl
      const imageUrl = (data.imageUrl && data.imageUrl.includes('Potato')) ? potatoImage : (data.imageUrl || potatoImage)
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

async function loadMobs(idToSelect?: string): Promise<void> {
  const result = await window.api.loadMobs()
  if (!result.success || !result.mobs) {
    console.error('Erreur de chargement:', result.error)
    showNotification(result.error || 'Erreur de chargement', 'error')
    return
  }

  try {
    const mobContainer = document.getElementById('mob-container')
    if (!mobContainer) return

    // Mémoriser l'ID sélectionné si non spécifié
    const currentSelectedId = idToSelect || getSelectedMob()?.id

    // Supprimer les renderers existants
    mobRenderers.forEach((renderer) => renderer.destroy())
    mobRenderers.clear()
    setSelectedMob(null)

    // Créer les nouveaux renderers à partir des données chargées
    result.mobs.forEach((data: MobData) => {
      const imageUrl = data.imageUrl.includes('Potato') ? potatoImage : data.imageUrl
      const renderer = new MobRenderer({ ...data, imageUrl })
      renderer.render(mobContainer)
      mobRenderers.set(data.id, renderer)
    })

    // Restaurer la sélection
    if (currentSelectedId && mobRenderers.has(currentSelectedId)) {
      setSelectedMob(mobRenderers.get(currentSelectedId)!)
    } else if (mobRenderers.size > 0) {
      const firstRenderer = mobRenderers.values().next().value
      if (firstRenderer) setSelectedMob(firstRenderer)
    }

    console.log('Mobs chargés avec succès:', mobRenderers.size)
  } catch (error) {
    console.error('Erreur de parsing:', error)
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

  // Bouton Sauvegarder Biome
  const btnSaveBiome = document.getElementById('btn-save-biome')
  btnSaveBiome?.addEventListener('click', () => {
    saveBiome()
  })
}

async function initBiome(): Promise<void> {
  const result = await window.api.loadBiome()
  if (result.success && result.data) {
    biomeRenderer.setObjects(result.data)
  } else {
    // Biome par défaut s'il n'y a rien
    biomeRenderer.addObject('tree', 200)
    biomeRenderer.addObject('flower', 400)
    biomeRenderer.addObject('tree', 600)
  }

  // Interval de croissance (Zen Garden style)
  setInterval(() => {
    biomeRenderer.growTrees()
  }, 30000) // Toutes les 30 secondes pour la démo (on pourrait faire plus long)
}

async function saveBiome(): Promise<void> {
  const data = biomeRenderer.getObjects()
  const result = await window.api.saveBiome(data)
  if (result.success) {
    showNotification('Biome sauvegardé !', 'success')
  } else {
    showNotification('Erreur sauvegarde biome', 'error')
  }
}

/**
 * Ajoute un nouveau mob via IPC
 */
async function addNewMob(): Promise<void> {
  const mobContainer = document.getElementById('mob-container')
  if (!mobContainer) return

  const randomName = generateRandomName()
  const result = await window.api.createMob(randomName, potatoImage)
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

  if (!window.confirm(`Voulez-vous vraiment supprimer ${mobRenderer.nom} ? Cette action est irréversible.`)) {
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

function setupWindowControls(): void {
  const btnMinimize = document.getElementById('btn-minimize')
  const btnClose = document.getElementById('btn-close')

  btnMinimize?.addEventListener('click', () => {
    window.api.minimizeWindow()
  })

  btnClose?.addEventListener('click', () => {
    window.api.closeWindow()
  })
}


function setupActionButtons(): void {
  // Bouton BASTON !
  const btnCombat = document.getElementById('btn-combat')
  btnCombat?.addEventListener('click', () => {
    console.log('[Renderer] BASTON button clicked')
    showNotification('Ouverture du menu BASTON...', 'success')

    combatUI.showSelectionMenu((f1, f2) => {
      // Safety check for mob stats
      if (!f1.stats || !f2.stats) {
        showNotification('Erreur: Stats de mob manquantes pour le combat', 'error');
        console.error('Combat error: One or both fighters are missing stats.', { f1, f2 });
        return;
      }
      combatUI.renderCombatScene(f1, f2, async (winner, loser) => {
        // Gérer la fin du combat (récompenses, mise à jour des stats, mort de l'autre)
        console.log('Combat terminé, vainqueur:', winner.nom)

        // Traiter le résultat côté serveur
        const result = await window.api.processCombatResult(winner, loser)
        console.log('[Renderer] Combat results processed (full heal applied):', result)

        showNotification('COMBAT TERMINÉ : Patates soignées ! ✨', 'success')

        // Sauvegarder l'état final
        await window.api.saveMobs()
        await loadMobs(winner.id) // Rafraîchir l'affichage en gardant le winner sélectionné
      })
    })
  })

  // Bouton TOURNOI
  const btnTournament = document.getElementById('btn-tournament')
  if (btnTournament) {
    btnTournament.addEventListener('click', async () => {
      const allMobs = Array.from(mobRenderers.values())

      if (allMobs.length < 8) {
        showNotification(`Il vous faut au moins 8 patates pour lancer un tournoi ! (${allMobs.length}/8)`, 'error')
        return
      }

      try {
        showNotification('Préparation du tournoi...', 'success')

        // Sélectionner 8 patates (on priorise la sélectionnée si elle existe)
        const selected = getSelectedMob()
        let participants: any[] = []

        if (selected) {
          participants.push(selected)
        }

        // Compléter avec d'autres patates aléatoires
        const others = allMobs.filter(m => m !== selected).sort(() => Math.random() - 0.5)
        participants = participants.concat(others).slice(0, 8)

        // Convertir en format participant de tournoi
        const tourParticipants = participants.map(m => ({
          id: m.id,
          nom: m.nom,
          imageUrl: typeof m.imageUrl === 'string' ? m.imageUrl : '',
          stats: m.stats,
          level: m.level,
          isPlayer: m === selected // On marque seulement la sélectionnée comme joueur
        }))

        // Générer et sauvegarder le nouveau tournoi
        const newData = TournamentManager.createTournament(tourParticipants)
        await window.api.saveTournament(newData)

        tournamentUI.show(handleMatchSelected)
      } catch (e) {
        showNotification(`Erreur: ${String(e)}`, 'error')
      }
    })
  }
}

/**
 * Gère la sélection d'un match dans le tournoi
 */
async function handleMatchSelected(match: any): Promise<void> {
  if (!match.participant1 || !match.participant2) return

  const f1 = participantToMobData(match.participant1)
  const f2 = participantToMobData(match.participant2)

  tournamentUI.hide()

  combatUI.renderCombatScene(f1, f2, async (winner, loser) => {
    console.log('Match de tournoi terminé, vainqueur:', winner.nom)

    // Avancer dans le tournoi
    await tournamentUI.handleMatchResult(winner.id)

    // Si c'est la patate du joueur, on traite les récompenses standards (XP, etc.)
    const isPlayerInvolved = (winner.id === f1.id && match.participant1.isPlayer) ||
      (winner.id === f2.id && match.participant2.isPlayer) ||
      (loser.id === f1.id && match.participant1.isPlayer) ||
      (loser.id === f2.id && match.participant2.isPlayer)

    if (isPlayerInvolved) {
      const result = await window.api.processCombatResult(winner, loser)
      console.log('[Renderer] Tournament match processed (full heal):', result)
      await window.api.saveMobs()
      await loadMobs()
    }

    // Vérifier si le tournoi est fini
    const tournamentResult = await window.api.getTournament()
    if (tournamentResult.success && tournamentResult.tournament?.status === 'completed') {
      const winnerName = tournamentResult.tournament.winnerId === f1.id ? f1.nom : f2.nom
      showNotification(`🏆 TOURNOI TERMINÉ ! VAINQUEUR : ${winnerName}`, 'success')

      const currentMob = getSelectedMob()
      if (currentMob && tournamentResult.tournament.winnerId === currentMob.id) {
        showNotification('VOUS AVEZ GAGNÉ LE TOURNOI ! 👑', 'success')

        // Traiter la victoire (XP + incrémenter le compteur)
        const winResult = await window.api.processTournamentWin(currentMob.id)
        if (winResult.success && winResult.mob) {
          const wins = winResult.mob.combatProgress.tournamentWins
          showNotification(`Victoires en tournoi : ${wins}`, 'success')

          if (wins === 1) {
            showNotification('NOUVEAU SKIN DÉBLOQUÉ : Couronne de Champion !', 'success')
          } else if (wins === 3) {
            showNotification('NOUVEAU SKIN DÉBLOQUÉ : Cape de Champion !', 'success')
          }

          // Recharger le mob pour voir les nouveaux stats/XP
          currentMob.updateFromData(winResult.mob)
        }
      }
    }

    // Réafficher le tournoi (ou proposer de le fermer)
    tournamentUI.show(handleMatchSelected)
  })
}

/**
 * Convertit un participant de tournoi en MobData pour le moteur de combat
 */
function participantToMobData(p: any): any {
  return {
    id: p.id,
    nom: p.nom,
    imageUrl: p.imageUrl || potatoImage,
    vie: 100 + (p.stats.vitalite * 5),
    energie: 100,
    status: 'vivant',
    stats: p.stats,
    level: p.level,
    experience: 0,
    statPoints: 0,
    traits: [],
    skin: { hat: 'none', bottom: 'none' },
    combatProgress: { wins: 0, losses: 0, winStreak: 0, tournamentWins: p.combatProgress?.tournamentWins || 0 }
  }
}

// Lancer l'initialisation quand le DOM est prêt (ou s'il l'est déjà)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => init())
} else {
  init()
}
