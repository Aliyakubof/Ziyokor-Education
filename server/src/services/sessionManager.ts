import { Question } from '../types';

interface PlayerEntry {
    id: string;
    name: string;
    score: number;
    telegramUserId: string;
    hasAnswered: boolean;
    streak: number;
    isUnregistered?: boolean;
    team?: 'Red' | 'Blue';
}

interface GameState {
    chatId: string;
    level?: string;
    quizId?: string;
    quizTitle?: string;
    questions: Question[];
    currentQIndex: number;
    players: PlayerEntry[];
    status: 'SETUP' | 'JOINING' | 'PLAYING' | 'FINISHED';
    gameMode: 'SOLO' | 'TEAM';
    teamScores: { Red: number, Blue: number };
    mainMessageId?: number;
    timer?: NodeJS.Timeout;
    joinTimerInterval?: NodeJS.Timeout;
    joinSecondsLeft?: number;
    questionStartTime?: number;
    totalCoinPool?: number;
    inactivityTimer?: NodeJS.Timeout;
    bonusMessageIds?: number[];
}

/**
 * GameSessionManager is responsible for managing active game states.
 * Current implementation uses an in-memory Map, but it's designed 
 * to be easily swappable with Redis for production scalability.
 */
class GameSessionManager {
    private sessions: Map<string, GameState> = new Map();

    async get(chatId: string): Promise<GameState | undefined> {
        return this.sessions.get(chatId);
    }

    async set(chatId: string, state: GameState): Promise<void> {
        this.sessions.set(chatId, state);
    }

    async delete(chatId: string): Promise<void> {
        const state = this.sessions.get(chatId);
        if (state && state.timer) {
            clearTimeout(state.timer);
        }
        if (state && state.joinTimerInterval) {
            clearInterval(state.joinTimerInterval);
        }
        if (state && state.inactivityTimer) {
            clearTimeout(state.inactivityTimer);
        }
        this.sessions.delete(chatId);
    }

    async has(chatId: string): Promise<boolean> {
        return this.sessions.has(chatId);
    }

    async getAll(): Promise<GameState[]> {
        return Array.from(this.sessions.values());
    }
}

export const gameSessions = new GameSessionManager();
export type { PlayerEntry, GameState };
