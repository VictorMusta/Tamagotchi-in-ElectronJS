import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs'
import { TournamentResult, TournamentData, TournamentHistory, SaveLoadResult } from '../shared/types'

class TournamentServiceClass {
  
  private getTournamentSavePath(): string {
    const userDataPath = app.getPath('userData')
    return join(userDataPath, 'tournament.json')
  }

  private getTournamentHistorySavePath(): string {
    const userDataPath = app.getPath('userData')
    return join(userDataPath, 'tournament_history.json')
  }

  getTournament(): TournamentResult {
    try {
      const path = this.getTournamentSavePath()
      if (!existsSync(path)) return { success: true }
      const data = readFileSync(path, 'utf-8')
      const tournament: TournamentData = JSON.parse(data)
      return { success: true, tournament }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  getTournamentHistory(): TournamentHistory {
    try {
      const path = this.getTournamentHistorySavePath()
      if (!existsSync(path)) return { success: true, tournaments: [] }
      const data = readFileSync(path, 'utf-8')
      const tournaments: TournamentData[] = JSON.parse(data)
      return { success: true, tournaments }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  saveTournament(data: TournamentData): SaveLoadResult {
    try {
      // Sauvegarde du tournoi actuel
      const path = this.getTournamentSavePath()
      writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8')

      // Si le tournoi est fini, on l'ajoute à l'historique
      if (data.status === 'completed') {
        this.archiveTournament(data)
      }

      return { success: true, path }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  private archiveTournament(tournament: TournamentData): void {
    try {
      const historyPath = this.getTournamentHistorySavePath()
      let history: TournamentData[] = []
      if (existsSync(historyPath)) {
        history = JSON.parse(readFileSync(historyPath, 'utf-8'))
      }

      // Éviter les doublons si on sauvegarde plusieurs fois un tournoi fini
      if (!history.find(t => t.id === tournament.id)) {
        history.push(tournament)
        writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf-8')
      }
    } catch (error) {
      console.error('Erreur lors de l\'archivage du tournoi:', error)
    }
  }

  resetTournament(): SaveLoadResult {
    try {
      const path = this.getTournamentSavePath()
      if (existsSync(path)) {
        unlinkSync(path)
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }
}

export const TournamentService = new TournamentServiceClass()
