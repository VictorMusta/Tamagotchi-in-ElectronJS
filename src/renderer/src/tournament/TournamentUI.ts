import { TournamentData, TournamentMatch, TournamentParticipant } from '../../../shared/types'
import { TournamentManager } from '../../../shared/TournamentManager'

export class TournamentUI {
    private overlay: HTMLElement | null = null
    private activeTournament: TournamentData | null = null
    private viewingTournament: TournamentData | null = null
    private historyData: TournamentData[] = []
    private isHistoryMode: boolean = false
    private onMatchSelected: (match: TournamentMatch) => void = () => { }

    constructor() {
        // Wait for next tick to ensure body is ready if possible, 
        // but since we are in renderer.ts it should be fine.
        if (document.body) this.createOverlay()
        else {
            document.addEventListener('DOMContentLoaded', () => this.createOverlay())
        }
    }

    private createOverlay(): void {
        this.overlay = document.createElement('div')
        this.overlay.className = 'tournament-overlay hidden'
        this.overlay.innerHTML = `
            <div class="tournament-header">
                <h1>TOURNOI DES PATATES</h1>
                <div class="tournament-tabs">
                    <button class="tab-btn active" id="tab-current">COURANT</button>
                    <button class="tab-btn" id="tab-history">HISTORIQUE</button>
                </div>
            </div>
            <div class="tournament-bracket-container" id="tournament-content">
                <div class="tournament-bracket" id="bracket-root"></div>
            </div>
            <div class="tournament-footer">
                <button class="menu-btn secondary" id="btn-close-tournament">FERMER</button>
            </div>
        `
        document.body.appendChild(this.overlay)

        document.getElementById('btn-close-tournament')?.addEventListener('click', () => {
            this.hide()
        })

        document.getElementById('tab-current')?.addEventListener('click', () => {
            this.switchMode(false)
        })

        document.getElementById('tab-history')?.addEventListener('click', () => {
            this.switchMode(true)
        })
    }

    private switchMode(history: boolean): void {
        this.isHistoryMode = history
        document.getElementById('tab-current')?.classList.toggle('active', !history)
        document.getElementById('tab-history')?.classList.toggle('active', history)

        if (this.isHistoryMode) {
            this.renderHistory()
        } else {
            this.viewingTournament = this.activeTournament
            this.renderBracket()
        }
    }

    public async show(onMatchSelected: (match: TournamentMatch) => void): Promise<void> {
        this.onMatchSelected = onMatchSelected

        const [currentRes, historyRes] = await Promise.all([
            window.api.getTournament(),
            window.api.getTournamentHistory()
        ])

        if (currentRes.success && currentRes.tournament) {
            this.activeTournament = currentRes.tournament
            this.viewingTournament = this.activeTournament
        }

        if (historyRes.success && historyRes.tournaments) {
            this.historyData = historyRes.tournaments
        }

        this.switchMode(false) // On commence sur le tournoi actuel
        this.overlay?.classList.remove('hidden')
    }

    public hide(): void {
        this.overlay?.classList.add('hidden')
    }

    private renderBracket(): void {
        const container = document.getElementById('tournament-content')
        if (!container) return

        container.innerHTML = '<div class="tournament-bracket" id="bracket-root"></div>'
        const root = document.getElementById('bracket-root')
        if (!root || !this.viewingTournament) {
            (document.getElementById('tournament-content') as HTMLElement).innerHTML = '<p class="no-data">Aucun tournoi actif</p>'
            return
        }

        this.viewingTournament.rounds.forEach((round, roundIndex) => {
            const col = document.createElement('div')
            col.className = `bracket-column round-${roundIndex}`

            round.matches.forEach((match, matchIndex) => {
                const matchEl = this.createMatchElement(match, roundIndex, matchIndex)
                col.appendChild(matchEl)
            })

            root.appendChild(col)
        })
    }

    private renderHistory(): void {
        const container = document.getElementById('tournament-content')
        if (!container) return

        if (this.historyData.length === 0) {
            container.innerHTML = '<p class="no-data">Aucun tournoi terminé dans l\'historique</p>'
            return
        }

        container.innerHTML = `
            <div class="history-list">
                ${this.historyData.reverse().map(t => {
            const winnerMatch = t.rounds[t.rounds.length - 1].matches[0]
            const winner = winnerMatch.winnerId === winnerMatch.participant1?.id ? winnerMatch.participant1 : winnerMatch.participant2
            return `
                    <div class="history-item" data-id="${t.id}">
                        <div class="h-info">
                            <span class="h-date">${new Date(parseInt(t.id.split('-')[1])).toLocaleDateString()}</span>
                            <span class="h-winner">Vainqueur: <strong>${winner ? winner.nom : 'Inconnu'}</strong></span>
                        </div>
                        <button class="view-btn">VOIR L'ARBRE</button>
                    </div>
                    `
        }).join('')}
            </div>
        `

        // Ajouter les event listeners pour voir les arbres
        container.querySelectorAll('.view-btn').forEach((btn, idx) => {
            btn.addEventListener('click', () => {
                const tournament = this.historyData[idx]
                this.showSpecificTournament(tournament)
            })
        })
    }

    private showSpecificTournament(t: TournamentData): void {
        this.viewingTournament = t
        this.isHistoryMode = false
        document.getElementById('tab-current')?.classList.add('active')
        document.getElementById('tab-history')?.classList.remove('active')
        this.renderBracket()
    }

    private createMatchElement(match: TournamentMatch, roundIndex: number, matchIndex: number): HTMLElement {
        const isCurrentMatch = this.viewingTournament?.id === this.activeTournament?.id &&
            this.activeTournament?.currentRoundIndex === roundIndex &&
            this.activeTournament?.currentMatchIndex === matchIndex

        const card = document.createElement('div')
        card.className = `match-card ${isCurrentMatch ? 'active' : ''}`

        const p1 = match.participant1
        const p2 = match.participant2

        card.innerHTML = `
            <div class="participant ${this.getParticipantClass(p1, match)}">
                <span class="p-name">${p1 ? p1.nom : '???'}</span>
                <span class="p-level">Lvl ${p1 ? p1.level : '?'}</span>
            </div>
            <div class="match-vs">VS</div>
            <div class="participant ${this.getParticipantClass(p2, match)}">
                <span class="p-name">${p2 ? p2.nom : '???'}</span>
                <span class="p-level">Lvl ${p2 ? p2.level : '?'}</span>
            </div>
        `

        if (isCurrentMatch && p1 && p2 && !match.isCompleted) {
            const btnContainer = document.createElement('div')
            btnContainer.className = 'match-actions'

            const btnSee = document.createElement('button')
            btnSee.className = 'btn-watch'
            btnSee.textContent = 'VOIR'
            btnSee.onclick = (e) => {
                e.stopPropagation()
                this.onMatchSelected(match)
            }

            const btnSim = document.createElement('button')
            btnSim.className = 'btn-simulate'
            btnSim.textContent = 'SIMULER'
            btnSim.onclick = (e) => {
                e.stopPropagation()
                this.simulateMatch(match)
            }

            btnContainer.appendChild(btnSee)
            btnContainer.appendChild(btnSim)
            card.appendChild(btnContainer)
        }

        return card
    }

    private getParticipantClass(p: TournamentParticipant | undefined, match: TournamentMatch): string {
        if (!p) return 'empty'
        let classes = p.isPlayer ? 'player' : ''
        if (match.isCompleted) {
            if (match.winnerId === p.id) classes += ' winner'
            else classes += ' loser'
        }
        return classes
    }

    private async simulateMatch(match: TournamentMatch): Promise<void> {
        if (!this.activeTournament) return
        const winnerId = TournamentManager.simulateMatch(match)
        this.activeTournament = TournamentManager.advanceTournament(this.activeTournament, winnerId)
        await window.api.saveTournament(this.activeTournament)
        this.viewingTournament = this.activeTournament
        this.renderBracket()
    }

    public async handleMatchResult(winnerId: string): Promise<void> {
        if (!this.activeTournament) return
        this.activeTournament = TournamentManager.advanceTournament(this.activeTournament, winnerId)
        await window.api.saveTournament(this.activeTournament)
        this.viewingTournament = this.activeTournament
        this.renderBracket()
    }
}
