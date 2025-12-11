// Gestionnaire de sons pour le jeu

export type SoundType = 'punch' | 'feed' | 'heal' | 'death' | 'revive'

// Cache des éléments audio pour éviter de les recréer à chaque fois
const audioCache: Map<SoundType, HTMLAudioElement> = new Map()

// Mapping des types de sons vers les fichiers
// Les fichiers doivent être placés dans src/renderer/assets/sounds/
const soundFiles: Record<SoundType, string> = {
  punch: new URL('../assets/sounds/placeholder_punch.mp3', import.meta.url).href,
  feed: new URL('../assets/sounds/placeholder_feed.mp3', import.meta.url).href,
  heal: new URL('../assets/sounds/placeholder_heal.mp3', import.meta.url).href,
  death: new URL('../assets/sounds/placeholder_death.mp3', import.meta.url).href,
  revive: new URL('../assets/sounds/placeholder_revive.mp3', import.meta.url).href
}

/**
 * Joue un son du type spécifié
 */
export function playSound(type: SoundType): void {
  try {
    let audio = audioCache.get(type)

    if (!audio) {
      audio = new Audio(soundFiles[type])
      audioCache.set(type, audio)
    }

    // Remettre au début si le son est déjà en cours de lecture
    audio.currentTime = 0
    audio.volume = 0.5
    audio.play().catch((error) => {
      // Silencieusement ignorer les erreurs si le fichier n'existe pas encore
      console.debug(`Son ${type} non disponible:`, error.message)
    })
  } catch (error) {
    console.debug(`Erreur lors de la lecture du son ${type}:`, error)
  }
}

/**
 * Précharge tous les sons pour éviter les délais de chargement
 */
export function preloadSounds(): void {
  Object.entries(soundFiles).forEach(([type, url]) => {
    try {
      const audio = new Audio(url)
      audio.preload = 'auto'
      audioCache.set(type as SoundType, audio)
    } catch (error) {
      console.debug(`Impossible de précharger le son ${type}`)
    }
  })
}

/**
 * Définit le volume global des sons (0 à 1)
 */
export function setVolume(volume: number): void {
  const clampedVolume = Math.max(0, Math.min(1, volume))
  audioCache.forEach((audio) => {
    audio.volume = clampedVolume
  })
}

