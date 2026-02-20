import { GameSession } from "./types";
import { query } from "./db";

export const games: Record<string, GameSession> = {}; // key is PIN (In-memory for active sessions)
export const studentSockets: Record<string, string> = {}; // key is studentId, value is socketId

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
        // Range 1,000,000 to 7,999,999
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
        // Range 8,000,000 to 9,999,999
        id = (Math.floor(8000000 + Math.random() * 2000000)).toString();
        const res = await query('SELECT id FROM students WHERE parent_id = $1', [id]);
        if (res.rowCount === 0) exists = false;
    }
    return id;
};
