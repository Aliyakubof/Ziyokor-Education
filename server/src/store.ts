import { GameSession } from "./types";
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
        await redisClient.set(`${GAME_PREFIX}${pin}`, JSON.stringify(session));
        // Expire after 24 hours of inactivity just in case
        await redisClient.expire(`${GAME_PREFIX}${pin}`, 24 * 60 * 60);
    },

    async getGame(pin: string): Promise<GameSession | null> {
        const data = await redisClient.get(`${GAME_PREFIX}${pin}`);
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
            const data = await redisClient.get(key);
            if (data) {
                const pin = key.replace(GAME_PREFIX, "");
                allGames[pin] = JSON.parse(data);
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
