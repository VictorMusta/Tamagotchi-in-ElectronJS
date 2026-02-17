import { ProfileRenderer } from './ProfileRenderer'
import { CombatUI } from './combat/CombatUI'
import { MobData } from '../../shared/types'
import { preloadSounds } from './SoundManager'
import { generateRandomName } from './utils/NameGenerator'
import { TournamentUI } from './tournament/TournamentUI'
import { TournamentManager } from '../../shared/TournamentManager'
import { PartyUI } from './mob/PartyUI'
import { PveUI } from './pve/PveUI'
import { MemorialUI } from './memorial/MemorialUI'

import {
  MobRenderer,
  getSelectedMob,
  setSelectedMob,
  setOnRenameCallback,
  setOnMobClick,
  setOnProfileOpen
} from './Mob'
const potatoImage = 'assets/Potato still.png'
import { PhysicsWorld } from './physics/PhysicsWorld'

// Map des renderers de mobs par ID
const mobRenderers: Map<string, MobRenderer> = new Map()
let isInitializingMobs = false

const themes = ['forest', 'cyberpunk', 'cozy']
let currentThemeIndex = 0

function applyTheme(themeName: string): void {
  document.body.classList.remove('theme-forest', 'theme-cyberpunk', 'theme-cozy')
  document.body.classList.add(`theme-${themeName}`)
  localStorage.setItem('selectedTheme', themeName)
}

function loadTheme(): void {
  const savedTheme = localStorage.getItem('selectedTheme')
  if (savedTheme && themes.includes(savedTheme)) {
    currentThemeIndex = themes.indexOf(savedTheme)
    applyTheme(savedTheme)
  } else {
    // Default theme
    applyTheme('forest')
  }
}

function toggleTheme(): void {
  currentThemeIndex = (currentThemeIndex + 1) % themes.length
  applyTheme(themes[currentThemeIndex])
}

// Initialisation
loadTheme()

// Initialisation du renderer de profil
const profileRenderer = new ProfileRenderer()

// Initialisation du système de combat (UI)
const combatUI = new CombatUI()

// Initialisation du système de tournoi (UI)
let tournamentUI: TournamentUI



// Physics World
const physicsWorld = new PhysicsWorld(document.getElementById('app') || document.body)

// High-Five Celebration Handler
physicsWorld.onHighFive = (x: number, y: number) => {
  console.log('🙌 HIGH-FIVE at', x, y)
  
  // Spawn emoji
  const emoji = document.createElement('div')
  emoji.className = 'high-five-emoji'
  emoji.textContent = '✋'
  emoji.style.left = `${x}px`
  emoji.style.top = `${y}px`
  document.body.appendChild(emoji)
  setTimeout(() => emoji.remove(), 1500)
  
  // Spawn gold celebration particles
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div')
    p.classList.add('celebration-particle')
    
    const angle = Math.random() * Math.PI * 2
    const dist = 60 + Math.random() * 120
    const tx = Math.cos(angle) * dist
    const ty = Math.sin(angle) * dist
    const rot = Math.random() * 360
    
    p.style.setProperty('--x', `${tx}px`)
    p.style.setProperty('--y', `${ty}px`)
    p.style.setProperty('--rot', `${rot}deg`)
    p.style.left = `${x}px`
    p.style.top = `${y}px`
    
    document.body.appendChild(p)
    setTimeout(() => p.classList.add('animate'), Math.random() * 50)
    setTimeout(() => p.remove(), 900)
  }
}

// Web API Fallback
import { WebApi } from './WebApi'
// @ts-ignore
if (!window.api) {
  console.log('Running in Web Mode - Using localStorage API')
  // @ts-ignore
  window.api = new WebApi()
}

// Party UI
let partyUI: PartyUI

// PvE UI
let pveUI: PveUI

// Memorial UI
let memorialUI: MemorialUI

async function applyActionToMob(mobRenderer: MobRenderer): Promise<void> {
  // Toggle selection
  const current = getSelectedMob()
  if (current && current.id === mobRenderer.id) {
    setSelectedMob(null)
  } else {
    setSelectedMob(mobRenderer)
  }
}

// Physics Helper removed


async function init(): Promise<void> {
  console.log('[Renderer] Initializing...')

  try {
    // 1. UI Setup
    tournamentUI = new TournamentUI()
    pveUI = new PveUI()
    memorialUI = new MemorialUI()
    partyUI = new PartyUI(
      () => { }, // On close
      () => loadMobs() // On update (moved from box to squad)
    )

    doAThing()
    setupOnsenDetection()
    setupActionButtons()
    setupWindowControls()
    setupSaveLoadButtons()
    setupMobManagementButtons()
    setupRenameCallback()
    setupParallax()
    setupPveAndMemorialButtons()
    setupCheatListener()

    console.log('[Renderer] UI Setup complete')

    // 2. Data/Content Setup (Async)
    await preloadSounds().catch(e => console.error('[Renderer] Sound preload failed:', e))
    await initMobs().catch(e => console.error('[Renderer] Mob init failed:', e))

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
  if (isInitializingMobs) return
  isInitializingMobs = true
  
  const mobContainer = document.getElementById('mob-container')
  if (!mobContainer) {
    isInitializingMobs = false
    return
  }

  // Essayer de charger la sauvegarde
  const loaded = await loadMobsOnStartup(mobContainer)

  // Si aucune sauvegarde n'existe, créer un mob par défaut
  if (!loaded) {
    const result = await window.api.createMob('Potato', potatoImage)
    if (result.success && result.mob) {
      const renderer = new MobRenderer(result.mob)
      renderer.render(mobContainer, physicsWorld)
      mobRenderers.set(result.mob.id, renderer)
    }
  }
  isInitializingMobs = false
}

async function loadMobsOnStartup(mobContainer: HTMLElement): Promise<boolean> {
  const result = await window.api.loadMobs()
  if (!result.success || !result.mobs || result.mobs.length === 0) {
    console.log('Aucune sauvegarde trouvée, création des mobs par défaut')
    return false
  }

  try {
    // Filter only squad mobs
    const squadMobs = result.mobs.filter((m: MobData) => m.inSquad)

    squadMobs.forEach((data: MobData) => {
      // Sécurité sur imageUrl
      const imageUrl = (data.imageUrl && data.imageUrl.includes('Potato')) ? potatoImage : (data.imageUrl || potatoImage)
      const renderer = new MobRenderer({ ...data, imageUrl })
      renderer.render(mobContainer, physicsWorld)
      mobRenderers.set(data.id, renderer)
    })




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
  // Use getAllMobs (memory) instead of loadMobs (disk) to ensure UI reflects current state
  // especially after deletions, avoiding race conditions with file writes.
  const result = await window.api.getAllMobs()
  if (!result.success || !result.mobs) {
    console.error('Erreur de chargement:', result.error)
    showNotification(result.error || 'Erreur de chargement', 'error')
    return
  }

  console.log('[Renderer] loadMobs result:', result.mobs.map(m => `${m.nom}: ${m.vie} HP (inOnsen: ${m.isInOnsen})`))

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
    // Enforce strict limit of 10 mobs for the squad view
    const squadMobs = result.mobs.filter((m: MobData) => m.inSquad).slice(0, 10)
    console.log('[Renderer] Squad mobs to render (limited to 10):', squadMobs.length)

    squadMobs.forEach((data: MobData, index: number) => {
      try {
        console.log(`[Renderer] Rendering mob ${index}: ${data.nom} (${data.id})`)
        const imageUrl = (data.imageUrl && data.imageUrl.includes('Potato')) ? potatoImage : (data.imageUrl || potatoImage)
        const renderer = new MobRenderer({ ...data, imageUrl })
        renderer.render(mobContainer, physicsWorld)
        mobRenderers.set(data.id, renderer)
      } catch (err) {
        console.error(`[Renderer] Failed to render mob ${data.nom}:`, err)
      }
    })

    // Restaurer la sélection
    if (currentSelectedId && mobRenderers.has(currentSelectedId)) {
      setSelectedMob(mobRenderers.get(currentSelectedId)!)
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

  document.getElementById('btn-theme')?.addEventListener('click', toggleTheme)
}

/**
 * Ajoute un nouveau mob via IPC
 */
async function addNewMob(): Promise<void> {
  const mobContainer = document.getElementById('mob-container')
  if (!mobContainer) return

  if (mobRenderers.size >= 10) {
    showNotification('L\'équipe est complète ! (Max 10)', 'error')
    return
  }

  const randomName = generateRandomName()
  const result = await window.api.createMob(randomName, potatoImage)
  if (result.success && result.mob) {
    const renderer = new MobRenderer(result.mob)
    renderer.render(mobContainer, physicsWorld)
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

  // Debug (Hitbox) Button
  const btnDebug = document.getElementById('btn-debug')
  btnDebug?.addEventListener('click', () => {
    const isDebug = physicsWorld.toggleDebug()
    combatUI.setDebug(isDebug)
  })

  // Delete All Button
  const btnDeleteAll = document.getElementById('btn-delete-all')
  if (btnDeleteAll) {
    console.log('[Renderer] Delete All button found, attaching listener.')
    btnDeleteAll.addEventListener('click', async () => {
      console.log('[Renderer] Delete All clicked.')

      if (!window.api.deleteAllMobs) {
        console.error('[Renderer] deleteAllMobs API is missing!')
        showNotification('Erreur: API non supportée (redémarrez ?)', 'error')
        return
      }

      if (confirm('⚠️ ATTENTION ⚠️\nVoulez-vous vraiment supprimer TOUTES les patates ?\nCette action est irréversible et supprimera toute votre progression.')) {
        if (confirm('Vraiment sûr ? Tout effacer ?')) {
          try {
            console.log('[Renderer] Calling deleteAllMobs...')
            await window.api.deleteAllMobs()
            console.log('[Renderer] deleteAllMobs success.')

            // Clear UI
            mobRenderers.forEach(r => r.destroy())
            mobRenderers.clear()
            setSelectedMob(null)
            showNotification('Toutes les patates ont été supprimées.', 'success')

            await initMobs()
          } catch (e) {
            console.error('[Renderer] Error executing deleteAllMobs:', e)
            showNotification('Erreur lors de la suppression: ' + String(e), 'error')
          }
        }
      }
    })
  } else {
    console.error('[Renderer] Delete All button NOT found in DOM.')
  }
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

/**
 * Setup PvE and Memorial button handlers
 */
function setupPveAndMemorialButtons(): void {
  console.log('[Renderer] Setting up PvE and Memorial buttons...')

  // PvE Button
  const btnPve = document.getElementById('btn-pve')
  console.log('[Renderer] btn-pve element:', btnPve)

  btnPve?.addEventListener('click', () => {
    console.log('[Renderer] PvE button clicked!')
    const selectedMob = getSelectedMob()
    if (!selectedMob) {
      showNotification('Sélectionnez une patate pour le combat PvE', 'error')
      return
    }

    // Get fresh mob data
    window.api.getMobById(selectedMob.id).then((result) => {
      if (!result.success || !result.mob) {
        showNotification('Erreur: Mob introuvable', 'error')
        return
      }

      pveUI.showEnemySelection(result.mob, async (enemy) => {
        // Start PvE combat
        console.log('[Renderer] Starting PvE combat:', result.mob!.nom, 'vs', enemy.nom)

        combatUI.renderCombatScene(result.mob!, enemy, async (winner, _loser) => {
          // Check if player won
          const playerWon = winner.id === result.mob!.id

          if (playerWon) {
            // Player survives - grant XP and maybe potion
            console.log(`[Renderer] Player won PvE! Winner: ${winner.nom}, HP: ${winner.vie}, Energy: ${winner.energie}`)
            
            // CRITICAL FIX: Update local renderer instance IMMEDIATELY to prevent the physics loop
            // from using stale data if it fires before the backend calls complete.
            const localRenderer = mobRenderers.get(winner.id)
            if (localRenderer) {
                localRenderer.vie = winner.vie
                localRenderer.energie = winner.energie
                
                // CRITICAL FIX: Reset local Onsen state to prevent the physics loop 
                // from thinking the mob has been in the Onsen all along (which would trigger full healing).
                localRenderer.isInOnsen = false
                localRenderer.hpAtOnsenEntry = null
                localRenderer.lastOnsenEntryTimestamp = null
                localRenderer.onsenPosition = null

                console.log(`[Renderer] Updated local renderer ${winner.nom} HP to ${winner.vie} and reset Onsen state`)
                
                // Force display update
                // @ts-ignore
                if (localRenderer.display) localRenderer.display.update(localRenderer)
            }

            // NEW: Use unified combat result processor
            console.log(`[Renderer] Calling processCombatResult for winner ${winner.nom}`)
            const combatResult = await window.api.processCombatResult(winner, enemy)
            
            if (combatResult.reward) {
                showNotification(`Récompense obtenue: ${combatResult.reward}`, 'success')
            }

            // Check for level ups
            await combatUI.handleLevelUps([combatResult.winner])

            // Save and refresh
            await loadMobs(winner.id)
            showNotification(`${winner.nom} a survécu !`, 'success')
          } else {
            // Player lost - check for potion
            console.log('[Renderer] Player lost PvE!')

            const potionResult = await window.api.getPotionCount()
            if (potionResult.success && potionResult.count > 0) {
              // Has potion - ask to use
              const usePotion = confirm(`💀 ${result.mob!.nom} est mort(e) !\n\n🧪 Vous avez ${potionResult.count} Potion(s) de Réanimation.\n\nVoulez-vous en utiliser une pour ressusciter ?`)

              if (usePotion) {
                const used = await window.api.usePotion()
                if (used.success) {
                  showNotification(`🧪 ${result.mob!.nom} ressuscite et continue le combat !`, 'success')
                  // Resurrect with full HP and continue (restart combat)
                  combatUI.renderCombatScene(result.mob!, enemy, async (w2, _l2) => {
                    // Recursive handling
                    await window.api.saveMobs()
                    await loadMobs(w2.id)
                  })
                  return
                }
              }
            }

            // No potion or declined - permadeath
            showNotification(`💀 ${result.mob!.nom} est mort(e) définitivement...`, 'error')

            // Add to memorial
            await window.api.addToMemorial(result.mob!, enemy.nom)

            // Delete the mob
            await window.api.deleteMob(result.mob!.id)

            // Refresh UI
            mobRenderers.get(result.mob!.id)?.destroy()
            mobRenderers.delete(result.mob!.id)
            setSelectedMob(null)
            await loadMobs()
          }
        })
      }, () => {
        // Cancelled
        console.log('[Renderer] PvE cancelled')
      })
    })
  })

  // Memorial Button
  const btnMemorial = document.getElementById('btn-memorial')
  console.log('[Renderer] btn-memorial element:', btnMemorial)

  btnMemorial?.addEventListener('click', () => {
    console.log('[Renderer] Memorial button clicked!')
    memorialUI.show()
  })

  console.log('[Renderer] PvE and Memorial buttons setup complete.')
}

/**
 * Listen for the secret code "tricher" to toggle cheat buttons
 */
function setupCheatListener(): void {
  console.log('[Renderer] Cheat listener armed...')
  const secret = 'tricher'
  let input = ''

  window.addEventListener('keydown', (e) => {
    // Basic catch-all listener
    if (e.key.length === 1) {
      input += e.key.toLowerCase()
      input = input.slice(-secret.length)

      if (input === secret) {
        document.body.classList.toggle('cheats-enabled')
        const enabled = document.body.classList.contains('cheats-enabled')
        showNotification(enabled ? 'TRICHES ACTIVÉES 🕵️‍♂️' : 'TRICHES DÉSACTIVÉES 🔒', enabled ? 'success' : 'error')
        input = ''
      }
    }
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
        
        // NEW: Unify with processCombatResult (Friendly = No XP/Reward, but Syncs HP and clears Onsen)
        // Update local renderer states
        const winRenderer = mobRenderers.get(winner.id)
        if (winRenderer) { winRenderer.vie = winner.vie; winRenderer.energie = winner.energie; winRenderer.isInOnsen = false; }
        const lossRenderer = mobRenderers.get(loser.id)
        if (lossRenderer) { lossRenderer.vie = loser.vie; lossRenderer.energie = loser.energie; lossRenderer.isInOnsen = false; }

        await window.api.processCombatResult(winner, loser, { grantXP: false })
        await loadMobs(winner.id)
      }, { combatType: 'friendly' }) // Mode Amical : Pas d'XP
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
          isPlayer: m === selected, // On marque seulement la sélectionnée comme joueur
          vie: m.vie // INCLUDE CURRENT HP
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

  // Bouton PC / Party
  const btnParty = document.getElementById('btn-party')
  btnParty?.addEventListener('click', () => {
    partyUI.toggle()
  })

  // Mobile Menu Toggle
  const btnMenuToggle = document.getElementById('btn-menu-toggle')
  if (btnMenuToggle) {
    btnMenuToggle.addEventListener('click', () => {
      const actionList = document.getElementById('action-list')
      actionList?.classList.toggle('expanded')
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

  // Use combatType: 'tournament' to prevent XP gain
  combatUI.renderCombatScene(f1, f2, async (winner, loser) => {
    console.log('Match de tournoi terminé, vainqueur:', winner.nom)

    // Avancer dans le tournoi
    await tournamentUI.handleMatchResult(winner.id)

    // Si c'est la patate du joueur, on met juste à jour l'affichage
    const isPlayerInvolved = (winner.id === f1.id && match.participant1.isPlayer) ||
      (winner.id === f2.id && match.participant2.isPlayer) ||
      (loser.id === f1.id && match.participant1.isPlayer) ||
      (loser.id === f2.id && match.participant2.isPlayer)

    if (isPlayerInvolved) {
      // NEW: Use unified combat result processor (No XP for tournaments)
      console.log(`[Renderer] Syncing tournament match result to backend for ${winner.nom} and ${loser.nom}`)
      
      // Update local renderer states
      const winRenderer = mobRenderers.get(winner.id)
      if (winRenderer) {
          winRenderer.vie = winner.vie
          winRenderer.energie = winner.energie
          winRenderer.isInOnsen = false
      }
      const lossRenderer = mobRenderers.get(loser.id)
      if (lossRenderer) {
          lossRenderer.vie = loser.vie
          lossRenderer.energie = loser.energie
          lossRenderer.isInOnsen = false
      }

      await window.api.processCombatResult(winner, loser, { grantXP: false })
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
    vie: p.vie !== undefined ? p.vie : (100 + (p.stats.vitalite * 10)),
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

// Parallax Effect
function setupParallax(): void {
  let bg = document.getElementById('parallax-background')
  if (!bg) {
    bg = document.createElement('div')
    bg.id = 'parallax-background'
    document.body.prepend(bg)
  }

  // Initialize variables
  document.body.style.setProperty('--parallax-x', '0px')
  document.body.style.setProperty('--parallax-y', '0px')

  // Mouse Move Listener
  document.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2 // -1 to 1
    const y = (e.clientY / window.innerHeight - 0.5) * 2 // -1 to 1

    // Base Unit: 10px (halved from original 20px request)
    const baseX = x * -10
    const baseY = y * -10

    document.body.style.setProperty('--parallax-x', `${baseX}px`)
    document.body.style.setProperty('--parallax-y', `${baseY}px`)

    // IMPORTANT: Sync physics interaction mouse offset
    // Mob container uses 0.6 factor for parallax
    // We must offset the mouse by the NEGATIVE of the visual shift
    // to align "absolute mouse" with shifted "physics bodies" (or vice versa in engine logic)
    // Actually, Matter.Mouse.setOffset(mouse, {x, y}) means mouse_engine = mouse_actual + offset
    // If visual is at mx + shift, and we click mx, we want engine to see px.
    // Wait: If mx = px + shift, engine wants to see mx - shift.
    const shiftX = baseX * 0.6
    const shiftY = baseY * 0.6
    
    // @ts-ignore
    if (physicsWorld) {
      physicsWorld.setMouseOffset(-shiftX, -shiftY)
    }
  })
}

function setupOnsenDetection(): void {
  const onsenZone = document.getElementById('onsen-zone')
  if (!onsenZone) return

  // Every 200ms, sync physics state and update healing
  setInterval(async () => {
    // PAUSE ONSEN LOGIC DURING COMBAT
    // This is critical to prevent the background Onsen loop from detecting the mob "in Onsen"
    // with its pre-combat HP (full) and overwriting the post-combat HP result (low) 
    // before the save/reload cycle completes.
    if (document.querySelector('.combat-overlay') || document.querySelector('.victory-overlay')) {
        return
    }

    // Update visual sensor for debug mode if active
    const rect = onsenZone.getBoundingClientRect()
    physicsWorld.updateOnsenSensor(rect)
    physicsWorld.updateOnsenWalls(rect)

    for (const renderer of mobRenderers.values()) {
        const physicsInOnsen = renderer.movement?.inOnsen ?? false
        
        // CASE 1: ENTERING ONSEN (Physics says YES, Renderer says NO)
        if (physicsInOnsen && !renderer.isInOnsen) {
            console.log(`[Onsen] ${renderer.nom} entered the water (detected via Physics).`)
            renderer.isInOnsen = true
            renderer.lastOnsenEntryTimestamp = Date.now()
            renderer.hpAtOnsenEntry = renderer.vie
            
            // Notification
            showNotification(`${renderer.nom} se repose dans le Onsen ♨️`, 'success')

            // Update Main Process
            const pos = renderer.movement?.body.position
            window.api.updateMobOnsenState(renderer.id, true, renderer.lastOnsenEntryTimestamp, renderer.hpAtOnsenEntry, pos ? {x: pos.x, y: pos.y} : null)
            
            // Force visual update (particles)
            // @ts-ignore
            renderer.display.setHealingState(true)
            // @ts-ignore
            renderer.display.update(renderer)
            
            renderer.stopBehavior()
        }
        
        // CASE 2: LEAVING ONSEN (Physics says NO, Renderer says YES)
        else if (!physicsInOnsen && renderer.isInOnsen) {
            console.log(`[Onsen] ${renderer.nom} left the water.`)
            renderer.isInOnsen = false
            renderer.lastOnsenEntryTimestamp = null
            renderer.hpAtOnsenEntry = null
            
            // Update Main Process
            window.api.updateMobOnsenState(renderer.id, false, null, null, null)
            
            // Force visual update (remove particles)
            // @ts-ignore
            renderer.display.setHealingState(false)
            // @ts-ignore
            renderer.display.update(renderer)
            
            renderer.startBehavior()
        }

        // CASE 3: HEALING TICK (While in Onsen)
        if (renderer.isInOnsen) {
            // Calculate healing based on time spent
            // Formula synchronized with MobModel.ts: 100% recovery in 5 minutes (300 seconds)
            const maxHP = 100 + (renderer.stats.vitalite * (renderer.hpMultiplier || 10))
            if (renderer.vie < maxHP) {
                const now = Date.now()
                const entryTime = renderer.lastOnsenEntryTimestamp || now
                
                const elapsedSeconds = (now - entryTime) / 1000
                const regenPercent = elapsedSeconds / 300
                const recoveredHP = regenPercent * maxHP
                
                // Base HP + Gained
                const calculatedHP = Math.min(maxHP, (renderer.hpAtOnsenEntry || 0) + recoveredHP)
                const finalHP = Math.floor(calculatedHP)
                
                if (finalHP !== Math.floor(renderer.vie)) {
                    renderer.vie = finalHP
                    
                    // Resurrect check
                    if (renderer.status === 'mort' && renderer.vie >= maxHP * 0.05) {
                        renderer.status = 'vivant'
                        window.api.updateMobStatus(renderer.id, 'vivant')
                        showNotification(`${renderer.nom} est ressuscité ! ♨️`, 'success')
                        // @ts-ignore
                        if (renderer.movement) renderer.movement.updateStatus('vivant')
                    }
                    
                    // Update API only on change
                    window.api.updateMobHP(renderer.id, renderer.vie)
                }
            }
            // Always update display to show healing indicator
            // @ts-ignore
            renderer.display.update(renderer)
            // @ts-ignore
            renderer.display.setHealingState(true)
        }
    }
  }, 200)

  // Physics interaction hook
  physicsWorld.onDraggableDropped = async (_body: Matter.Body) => {
    // Logic moved to polling loop above (see CASE 1/2) based on physics inOnsen state
    // This hook now only handles specific dropped logic if needed (e.g. sound effect)
    // For now, it is redundant regarding Onsen detection
  }
}

// Lancer l'initialisation quand le DOM est prêt (ou s'il l'est déjà)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => init())
} else {
  init()
}
