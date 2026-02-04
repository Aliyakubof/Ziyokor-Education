import { GameSession } from "./types";
import { query } from "./db";

export const games: Record<string, GameSession> = {}; // key is PIN (In-memory for active sessions)

export const generatePin = () => {
    let pin = '';
    do {
        pin = Math.floor(100000 + Math.random() * 900000).toString();
    } while (games[pin]);
    return pin;
};

export const generateStudentId = async () => {
    let id = '';
    let exists = true;
    while (exists) {
        id = Math.floor(1000000 + Math.random() * 9000000).toString();
        const res = await query('SELECT id FROM students WHERE id = $1', [id]);
        if (res.rowCount === 0) exists = false;
    }
    return id;
};
