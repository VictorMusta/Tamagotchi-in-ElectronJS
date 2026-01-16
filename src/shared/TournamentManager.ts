import { TournamentData, TournamentParticipant, TournamentRound, TournamentMatch } from './types'

export class TournamentManager {
    static createTournament(participants: TournamentParticipant[]): TournamentData {
        if (participants.length !== 8) {
            throw new Error('Un tournoi nécessite exactement 8 participants')
        }
        participants.sort(() => Math.random() - 0.5)

        // Generate Quarters (Round 0)
        const round0: TournamentRound = {
            matches: Array.from({ length: 4 }, (_, i) => ({
                id: `q${i}`,
                participant1: participants[i * 2],
                participant2: participants[i * 2 + 1],
                isCompleted: false
            }))
        }

        // Round 1 (Semis) and Round 2 (Final) matches will be filled as winners are determined
        const round1: TournamentRound = {
            matches: [
                { id: 's0', isCompleted: false },
                { id: 's1', isCompleted: false }
            ]
        }

        const round2: TournamentRound = {
            matches: [
                { id: 'f0', isCompleted: false }
            ]
        }

        return {
            id: `tour-${Date.now()}`,
            status: 'active',
            rounds: [round0, round1, round2],
            currentRoundIndex: 0,
            currentMatchIndex: 0
        }
    }

    static advanceTournament(tournament: TournamentData, winnerId: string): TournamentData {
        const currentRound = tournament.rounds[tournament.currentRoundIndex]
        const currentMatch = currentRound.matches[tournament.currentMatchIndex]

        currentMatch.winnerId = winnerId
        currentMatch.isCompleted = true

        // Find winner full data
        const winner = currentMatch.participant1?.id === winnerId ? currentMatch.participant1 : currentMatch.participant2

        // If there's a next round, move the winner there
        if (tournament.currentRoundIndex < tournament.rounds.length - 1) {
            const nextRound = tournament.rounds[tournament.currentRoundIndex + 1]
            const nextMatchIndex = Math.floor(tournament.currentMatchIndex / 2)
            const nextMatch = nextRound.matches[nextMatchIndex]

            if (tournament.currentMatchIndex % 2 === 0) {
                nextMatch.participant1 = winner
            } else {
                nextMatch.participant2 = winner
            }
        }

        // Advance indices
        tournament.currentMatchIndex++
        if (tournament.currentMatchIndex >= currentRound.matches.length) {
            tournament.currentRoundIndex++
            tournament.currentMatchIndex = 0

            // If we reached beyond the last round, tournament is over
            if (tournament.currentRoundIndex >= tournament.rounds.length) {
                tournament.status = 'completed'
                tournament.winnerId = winnerId
            }
        }

        return tournament
    }

    /**
     * Simulation d'un match (utilisé pour les matchs entre patates du hub non-jouées)
     */
    static simulateMatch(match: TournamentMatch): string {
        if (!match.participant1 || !match.participant2) return ''

        const getPower = (p: TournamentParticipant) =>
            p.stats.force + p.stats.vitesse + p.stats.agilite + p.stats.vitalite

        const p1Power = getPower(match.participant1)
        const p2Power = getPower(match.participant2)

        const total = p1Power + p2Power
        return Math.random() < (p1Power / total) ? match.participant1.id : match.participant2.id
    }
}
