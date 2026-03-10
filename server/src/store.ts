import { GameSession, Player, Quiz, UnitQuiz } from "./types";
import { query } from "./db";
import { createClient } from "redis";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env") });

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const redisClient = createClient({ url: redisUrl });

let useRedis = false;
const memoryStore = new Map<string, any>();

// Auto-connect to Redis
(async () => {
    try {
        redisClient.on("error", (err) => {
            // Suppress repeating errors if already failed
            if (useRedis) console.error("Redis Client Error", err);
        });
        await redisClient.connect();
        useRedis = true;
        console.log(`[Redis] Store connected to ${redisUrl}`);
    } catch (err) {
        useRedis = false;
        console.log("[Memory Store] Redis connection failed, falling back to in-memory store. Game state will NOT persist across restarts.");
    }
})();

// Helper to handle Redis JSON storage
const GAME_PREFIX = "game:";
const SOCKET_PREFIX = "student_socket:";

export const store = {
    async setGame(pin: string, session: GameSession): Promise<void> {
        const key = `${GAME_PREFIX}${pin}`;
        const { players, ...metadata } = session;

        if (!useRedis) {
            memoryStore.set(key, JSON.stringify(session));
            return;
        }

        try {
            const p = redisClient.multi();
            p.hSet(key, 'metadata', JSON.stringify(metadata));
            if (players && players.length > 0) {
                for (const player of players) {
                    p.hSet(key, `player:${player.id}`, JSON.stringify(player));
                }
            }
            p.expire(key, 24 * 60 * 60);
            await p.exec();
        } catch (err) {
            console.error('[Redis] setGame error:', err);
        }
    },

    async getGame(pin: string): Promise<GameSession | null> {
        const key = `${GAME_PREFIX}${pin}`;

        if (!useRedis) {
            const data = memoryStore.get(key);
            return data ? JSON.parse(data) : null;
        }

        try {
            const data = await redisClient.hGetAll(key);
            if (data && Object.keys(data).length > 0) {
                const session = JSON.parse(data.metadata) as GameSession;
                session.players = [];
                for (const [field, value] of Object.entries(data)) {
                    if (field.startsWith('player:')) {
                        session.players.push(JSON.parse(value));
                    }
                }
                return session;
            }

            const legacyData = await redisClient.get(key);
            if (legacyData) {
                return JSON.parse(legacyData);
            }
        } catch (err) {
            console.error(`[Redis] Error getting game ${pin}:`, err);
        }
        return null;
    },

    /**
     * Highly optimized method to update a single player's answer without 
     * reading/writing the entire game state.
     */
    async updatePlayerAnswer(pin: string, playerId: string, qIdx: number, answer: string | number): Promise<void> {
        const key = `${GAME_PREFIX}${pin}`;

        if (!useRedis) {
            const gameData = memoryStore.get(key);
            if (!gameData) return;
            const session = JSON.parse(gameData);
            const player = session.players?.find((p: any) => p.id === playerId);
            if (player) {
                player.answers = player.answers || {};
                player.answers[qIdx.toString()] = answer;
                memoryStore.set(key, JSON.stringify(session));
            }
            return;
        }

        try {
            const playerField = `player:${playerId}`;
            const playerDataRaw = await redisClient.hGet(key, playerField);
            if (!playerDataRaw) return;

            const player = JSON.parse(playerDataRaw);
            player.answers = player.answers || {};
            player.answers[qIdx.toString()] = answer;
            await redisClient.hSet(key, playerField, JSON.stringify(player));
        } catch (err) {
            console.error(`[Redis] Error updating player answer:`, err);
        }
    },

    /**
     * Get a single player from a game session.
     */
    async getPlayer(pin: string, playerId: string): Promise<Player | null> {
        if (!useRedis) {
            const session = await this.getGame(pin);
            return session?.players?.find(p => p.id === playerId) || null;
        }
        try {
            const data = await redisClient.hGet(`${GAME_PREFIX}${pin}`, `player:${playerId}`);
            return data ? JSON.parse(data) : null;
        } catch (e) { return null; }
    },

    async setPlayer(pin: string, player: Player): Promise<void> {
        if (!useRedis) {
            const session = await this.getGame(pin);
            if (session) {
                session.players = session.players || [];
                const idx = session.players.findIndex(p => p.id === player.id);
                if (idx >= 0) session.players[idx] = player;
                else session.players.push(player);
                memoryStore.set(`${GAME_PREFIX}${pin}`, JSON.stringify(session));
            }
            return;
        }
        try {
            await redisClient.hSet(`${GAME_PREFIX}${pin}`, `player:${player.id}`, JSON.stringify(player));
        } catch (e) { }
    },

    async getGameMetadata(pin: string): Promise<Partial<GameSession> | null> {
        if (!useRedis) {
            const session = await this.getGame(pin);
            if (!session) return null;
            const { players, ...metadata } = session;
            return metadata;
        }
        try {
            const data = await redisClient.hGet(`${GAME_PREFIX}${pin}`, 'metadata');
            return data ? JSON.parse(data) : null;
        } catch (e) { return null; }
    },

    async deleteGame(pin: string): Promise<void> {
        if (!useRedis) {
            memoryStore.delete(`${GAME_PREFIX}${pin}`);
            return;
        }
        try { await redisClient.del(`${GAME_PREFIX}${pin}`); } catch (e) { }
    },

    async setSocket(studentId: string, socketId: string): Promise<void> {
        if (!useRedis) {
            memoryStore.set(`${SOCKET_PREFIX}${studentId}`, socketId);
            return;
        }
        try {
            await redisClient.set(`${SOCKET_PREFIX}${studentId}`, socketId);
            await redisClient.expire(`${SOCKET_PREFIX}${studentId}`, 48 * 60 * 60);
        } catch (e) { }
    },

    async getSocket(studentId: string): Promise<string | null> {
        if (!useRedis) return memoryStore.get(`${SOCKET_PREFIX}${studentId}`) || null;
        try { return await redisClient.get(`${SOCKET_PREFIX}${studentId}`); } catch (e) { return null; }
    },

    async deleteSocket(studentId: string): Promise<void> {
        if (!useRedis) {
            memoryStore.delete(`${SOCKET_PREFIX}${studentId}`);
            return;
        }
        try { await redisClient.del(`${SOCKET_PREFIX}${studentId}`); } catch (e) { }
    },

    async getAllGames(): Promise<Record<string, GameSession>> {
        const allGames: Record<string, GameSession> = {};
        if (!useRedis) {
            for (const [key, value] of memoryStore.entries()) {
                if (key.startsWith(GAME_PREFIX)) {
                    allGames[key.replace(GAME_PREFIX, "")] = JSON.parse(value);
                }
            }
            return allGames;
        }
        try {
            const keys = await redisClient.keys(`${GAME_PREFIX}*`);
            for (const key of keys) {
                const pin = key.replace(GAME_PREFIX, "");
                const game = await this.getGame(pin);
                if (game) allGames[pin] = game;
            }
        } catch (e) { }
        return allGames;
    }
};

// Legacy support helpers (though they should be async now)
export const generatePin = async () => {
    let pin = '';
    let exists = true;
    while (exists) {
        pin = Math.floor(100000 + Math.random() * 900000).toString();
        const existing = await store.getGame(pin);
        if (!existing) exists = false;
    }
    return pin;
};

export const generateStudentId = async () => {
    let id = '';
    let exists = true;
    while (exists) {
        id = (Math.floor(1000000 + Math.random() * 7000000)).toString();
        const res = await query('SELECT id FROM students WHERE id = $1', [id]);
        if (res.rowCount === 0) exists = false;
    }
    return id;
};

export const generateParentId = async () => {
    let id = '';
    let exists = true;
    while (exists) {
        id = (Math.floor(8000000 + Math.random() * 2000000)).toString();
        const res = await query('SELECT id FROM students WHERE parent_id = $1', [id]);
        if (res.rowCount === 0) exists = false;
    }
    return id;
};
