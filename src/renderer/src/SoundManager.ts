// Gestionnaire de sons pour le jeu - utilise Web Audio API pour meilleure compatibilité

export type SoundType = 'punch' | 'heal' | 'death' | 'revive'

// AudioContext partagé
let audioContext: AudioContext | null = null

// Cache des buffers audio décodés
const audioBufferCache: Map<SoundType, AudioBuffer> = new Map()

// Volume global
let globalVolume = 0.5

// Mapping des types de sons vers les fichiers
const soundFiles: Record<SoundType, string> = {
  punch: new URL('../assets/sounds/placeholder_punch.mp3', import.meta.url).href,

  heal: new URL('../assets/sounds/placeholder_heal.mp3', import.meta.url).href,
  death: new URL('../assets/sounds/placeholder_death.mp3', import.meta.url).href,
  revive: new URL('../assets/sounds/placeholder_revive.mp3', import.meta.url).href
}

/**
 * Initialise l'AudioContext (doit être appelé après une interaction utilisateur)
 */
function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
    console.log('[SoundManager] AudioContext créé, état:', audioContext.state)
  }
  // Reprendre si suspendu (politique autoplay)
  if (audioContext.state === 'suspended') {
    audioContext.resume().then(() => {
      console.log('[SoundManager] AudioContext repris')
    })
  }
  return audioContext
}

/**
 * Charge un fichier audio et le décode en AudioBuffer
 */
async function loadAudioBuffer(type: SoundType): Promise<AudioBuffer | null> {
  try {
    const url = soundFiles[type]
    console.log(`[SoundManager] Chargement de ${type} depuis ${url}`)

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const ctx = getAudioContext()
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer)

    console.log(`[SoundManager] ${type} chargé avec succès (durée: ${audioBuffer.duration}s)`)
    return audioBuffer
  } catch (error) {
    console.error(`[SoundManager] Erreur chargement ${type}:`, error)
    return null
  }
}

/**
 * Joue un son du type spécifié
 */
export async function playSound(type: SoundType): Promise<void> {
  try {
    console.log(`[SoundManager] Playing sound: ${type}`)

    const ctx = getAudioContext()

    // Vérifier si l'AudioContext est fonctionnel
    if (ctx.state === 'closed') {
      console.warn('[SoundManager] AudioContext fermé, impossible de jouer le son')
      return
    }

    // Récupérer ou charger le buffer
    let buffer = audioBufferCache.get(type)
    if (!buffer) {
      const loadedBuffer = await loadAudioBuffer(type)
      if (loadedBuffer) {
        buffer = loadedBuffer
        audioBufferCache.set(type, buffer)
      }
    }

    if (!buffer) {
      console.error(`[SoundManager] Buffer non disponible pour ${type}`)
      return
    }

    // Créer les nodes audio
    const source = ctx.createBufferSource()
    const gainNode = ctx.createGain()

    source.buffer = buffer
    gainNode.gain.value = globalVolume

    // Connecter: source -> gain -> destination
    source.connect(gainNode)
    gainNode.connect(ctx.destination)

    // Jouer le son
    source.start(0)
    console.log(`[SoundManager] Son ${type} démarré (AudioContext state: ${ctx.state})`)
  } catch (error) {
    console.error(`[SoundManager] Exception ${type}:`, error)
  }
}

/**
 * Précharge tous les sons pour éviter les délais de chargement
 */
export async function preloadSounds(): Promise<void> {
  console.log('[SoundManager] Préchargement des sons...')

  // Initialiser l'AudioContext
  getAudioContext()

  // Charger tous les sons en parallèle
  const loadPromises = Object.keys(soundFiles).map(async (type) => {
    const buffer = await loadAudioBuffer(type as SoundType)
    if (buffer) {
      audioBufferCache.set(type as SoundType, buffer)
    }
  })

  await Promise.all(loadPromises)
  console.log(`[SoundManager] ${audioBufferCache.size} sons préchargés`)
}

/**
 * Définit le volume global des sons (0 à 1)
 */
export function setVolume(volume: number): void {
  globalVolume = Math.max(0, Math.min(1, volume))
  console.log(`[SoundManager] Volume défini à ${globalVolume}`)
}
