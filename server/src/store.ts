import { GameSession, Player, Quiz, UnitQuiz } from "./types";
import { query } from "./db";
import { createClient } from "redis";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env") });

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const redisClient = createClient({ url: redisUrl });
redisClient.on("error", (err) => console.error("Redis Client Error", err));

// Auto-connect to Redis
(async () => {
    try {
        await redisClient.connect();
        console.log(`[Redis] Store connected to ${redisUrl}`);
    } catch (err) {
        console.error("[Redis] Connection failed, game state will NOT persist across instances!");
    }
})();

// Helper to handle Redis JSON storage
const GAME_PREFIX = "game:";
const SOCKET_PREFIX = "student_socket:";

export const store = {
    async setGame(pin: string, session: GameSession): Promise<void> {
        const key = `${GAME_PREFIX}${pin}`;
        // Extract players to store separately in the hash
        const { players, ...metadata } = session;

        // We use a multi/transaction to ensure atomicity and set the expiry
        const p = redisClient.multi();
        p.hSet(key, 'metadata', JSON.stringify(metadata));

        // Store each player as a separate field in the hash
        if (players && players.length > 0) {
            for (const player of players) {
                p.hSet(key, `player:${player.id}`, JSON.stringify(player));
            }
        }

        p.expire(key, 24 * 60 * 60);
        await p.exec();
    },

    async getGame(pin: string): Promise<GameSession | null> {
        const key = `${GAME_PREFIX}${pin}`;

        // Try Hash first (new format)
        const data = await redisClient.hGetAll(key);
        if (data && Object.keys(data).length > 0) {
            try {
                const session = JSON.parse(data.metadata) as GameSession;
                session.players = [];
                for (const [field, value] of Object.entries(data)) {
                    if (field.startsWith('player:')) {
                        session.players.push(JSON.parse(value));
                    }
                }
                return session;
            } catch (err) {
                console.error(`[Redis] Error parsing hash game ${pin}:`, err);
                return null;
            }
        }

        // Fallback to legacy string (old format)
        const legacyData = await redisClient.get(key);
        if (legacyData) {
            try {
                return JSON.parse(legacyData);
            } catch (err) {
                console.error(`[Redis] Error parsing legacy game ${pin}:`, err);
                return null;
            }
        }

        return null;
    },

    /**
     * Highly optimized method to update a single player's answer without 
     * reading/writing the entire game state.
     */
    async updatePlayerAnswer(pin: string, playerId: string, qIdx: number, answer: string | number): Promise<void> {
        const key = `${GAME_PREFIX}${pin}`;
        const playerField = `player:${playerId}`;

        const playerDataRaw = await redisClient.hGet(key, playerField);
        if (!playerDataRaw) return;

        try {
            const player = JSON.parse(playerDataRaw);
            player.answers = player.answers || {};
            player.answers[qIdx.toString()] = answer;
            await redisClient.hSet(key, playerField, JSON.stringify(player));
        } catch (err) {
            console.error(`[Redis] Error updating player answer for ${playerId} in game ${pin}:`, err);
        }
    },

    /**
     * Get a single player from a game session.
     */
    async getPlayer(pin: string, playerId: string): Promise<Player | null> {
        const data = await redisClient.hGet(`${GAME_PREFIX}${pin}`, `player:${playerId}`);
        return data ? JSON.parse(data) : null;
    },

    /**
     * Update/Set a single player in a game session.
     */
    async setPlayer(pin: string, player: Player): Promise<void> {
        await redisClient.hSet(`${GAME_PREFIX}${pin}`, `player:${player.id}`, JSON.stringify(player));
    },

    /**
     * Get only the metadata (non-player data) of a game session.
     */
    async getGameMetadata(pin: string): Promise<Partial<GameSession> | null> {
        const data = await redisClient.hGet(`${GAME_PREFIX}${pin}`, 'metadata');
        return data ? JSON.parse(data) : null;
    },

    async deleteGame(pin: string): Promise<void> {
        await redisClient.del(`${GAME_PREFIX}${pin}`);
    },

    async setSocket(studentId: string, socketId: string): Promise<void> {
        await redisClient.set(`${SOCKET_PREFIX}${studentId}`, socketId);
        await redisClient.expire(`${SOCKET_PREFIX}${studentId}`, 48 * 60 * 60);
    },

    async getSocket(studentId: string): Promise<string | null> {
        return await redisClient.get(`${SOCKET_PREFIX}${studentId}`);
    },

    async deleteSocket(studentId: string): Promise<void> {
        await redisClient.del(`${SOCKET_PREFIX}${studentId}`);
    },

    async getAllGames(): Promise<Record<string, GameSession>> {
        const keys = await redisClient.keys(`${GAME_PREFIX}*`);
        const allGames: Record<string, GameSession> = {};
        for (const key of keys) {
            const pin = key.replace(GAME_PREFIX, "");
            const game = await this.getGame(pin);
            if (game) {
                allGames[pin] = game;
            }
        }
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
