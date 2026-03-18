import dotenv from 'dotenv';
dotenv.config();

process.env.TZ = 'Asia/Tashkent';
import express from 'express';
import { createServer } from 'http';
import https from 'https';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { store, generatePin, generateStudentId, generateParentId } from './store';
import { query } from './db';
import { schema } from './schema';
import { Player, Question } from './types';
import { bot, launchBot, notifyTeacher, notifyStudentSubscribers, sendWeeklyReports, sendBattleAlert, sendSoloQuizPDF } from './bot';
import { generateQuizResultPDF, generateGroupContactPDF, generateSoloQuizPDF, generateWeeklyTeacherReportPDF } from './pdfGenerator';
import { normalizeAnswer, checkAnswer, countCorrectParts } from './utils';
import { checkAnswerWithAI, checkAnswersWithAIBatch } from './aiChecker';
import { startCronJobs } from './cron';

import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import apiRoutes from './routes';
import { requireRole, JWT_SECRET, generateToken } from './middleware/auth';
import { awardRewards, bulkAwardRewards } from './services/rewardService';
import { upload } from './middleware/upload';
import { ADMIN_ID, MANAGER_ID } from './constants';

import multer from 'multer';

const app = express();
const RESULTS_DIR = path.join(__dirname, '..', 'storage', 'results');
const UPLOADS_DIR = path.join(__dirname, '..', 'storage', 'uploads');

if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage config moved to middleware/upload.ts

// Apply global response payload compression (GZip) - Reduces JSON payload sizes down ~70%
// Moved up to ensure static files and early responses are also compressed
app.use(compression());

// Serve static files from uploads directory
app.use('/uploads', express.static(UPLOADS_DIR));

const allowedOrigins = [
    process.env.FRONTEND_URL,
    'https://zeducation.uz',
    'https://www.zeducation.uz',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost',
    'https://localhost',
    'http://localhost:8080',
    'http://localhost:8100',
    'capacitor://localhost',
    'https://ziyokoreducation.vercel.app'
].filter(Boolean) as string[];

// Log current time to verify timezone
console.log('Server Timezone:', process.env.TZ);
console.log('Current Server Time:', new Date().toLocaleString());

app.use(cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

// Apply basic security headers
app.use(helmet());



// Limit payload size to 50mb (increased to allow saving large quizzes)
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

// generateToken and JWT_SECRET removed (now in middleware/auth.ts or constants.ts)

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

import { initSocket } from './socket';

// --- Web Socket Game Engine (Modularized in socket.ts) ---
initSocket(io);

// Redis Adapter for PM2 Cluster scaling
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const pubClient = createClient({
    url: redisUrl,
    socket: {
        reconnectStrategy: false // Disable reconnection attempts to stop endless error loops
    }
});
const subClient = pubClient.duplicate();

let useRedisIo = false;

pubClient.on('error', (err: any) => {
    if (useRedisIo) console.warn('[Redis] Pub Error:', err.message);
});
subClient.on('error', (err: any) => {
    if (useRedisIo) console.warn('[Redis] Sub Error:', err.message);
});

Promise.all([pubClient.connect(), subClient.connect()])
    .then(() => {
        useRedisIo = true;
        io.adapter(createAdapter(pubClient, subClient));
        console.log(`[Socket.io] Redis adapter connected to ${redisUrl}`);
    })
    .catch((err: any) => {
        useRedisIo = false;
        console.warn('[Socket.io] Fallback to in-memory adapter (Redis connection failed).');
    });

app.use('/api', apiRoutes);

// ADMIN_ID and MANAGER_ID removed (now in constants.ts)

// Secure JWT and role-based auth middleware
// requireRole removed (now in middleware/auth.ts)

async function initDb() {
    try {
        const statements = schema
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            await query(statement);
        }

        // Essential migrations
        await query('ALTER TABLE game_results ADD COLUMN IF NOT EXISTS total_questions INT NOT NULL DEFAULT 0;');
        await query('ALTER TABLE teachers ADD COLUMN IF NOT EXISTS plain_password TEXT;');
        await query('ALTER TABLE students ADD COLUMN IF NOT EXISTS plain_password TEXT;');
        await query('ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_id TEXT UNIQUE;');
        await query("ALTER TABLE groups ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'Beginner';");

        await query(`
            CREATE TABLE IF NOT EXISTS duel_quizzes (
                id UUID PRIMARY KEY,
                title TEXT NOT NULL,
                questions JSONB NOT NULL,
                daraja TEXT NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Backfill parent_id for existing students
        const studentsWithoutParentId = await query('SELECT id FROM students WHERE parent_id IS NULL');
        for (const row of studentsWithoutParentId.rows) {
            const pid = await generateParentId();
            await query('UPDATE students SET parent_id = $1 WHERE id = $2', [pid, row.id]);
        }

        console.log('Database initialized successfully');
        await ensureAdminExists();
        await ensureManagerExists();
    } catch (err) {
        console.error('Error initializing database:', err);
    }
}


async function ensureAdminExists() {
    try {
        const res = await query('SELECT * FROM teachers WHERE id = $1', [ADMIN_ID]);
        if (res.rowCount === 0) {
            const adminPhone = process.env.ADMIN_PHONE || '998901234567';
            const adminPassword = process.env.ADMIN_PASSWORD || '4567';
            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            await query(
                'INSERT INTO teachers (id, name, phone, password, plain_password) VALUES ($1, $2, $3, $4, $5)',
                [ADMIN_ID, 'Admin', adminPhone, hashedPassword, adminPassword]
            );
            console.log('Admin teacher record created');
        }
    } catch (err) {
        console.error('Error ensuring admin exists:', err);
    }
}

async function ensureManagerExists() {
    try {
        const res = await query('SELECT * FROM teachers WHERE id = $1', [MANAGER_ID]);
        if (res.rowCount === 0) {
            const managerPhone = process.env.MANAGER_PHONE || '998947212531';
            const managerPassword = process.env.MANAGER_PASSWORD || '2531';
            const hashedPassword = await bcrypt.hash(managerPassword, 10);
            await query(
                'INSERT INTO teachers (id, name, phone, password, plain_password) VALUES ($1, $2, $3, $4, $5)',
                [MANAGER_ID, 'Menejer', managerPhone, hashedPassword, managerPassword]
            );
            console.log('Manager record created in teachers table');
        }
    } catch (err) {
        console.error('Error ensuring manager exists:', err);
    }
}

// Health Check

app.post('/api/logout', (req, res) => {
    res.clearCookie('ziyokor_token');
    res.json({ success: true });
});

// --- Group Battles Business Logic ---

async function matchGroupsForBattle() {
    try {
        console.log('[Battle] Starting group matching...');
        // 1. Terminate any old active battles
        await query("UPDATE group_battles SET status = 'finished' WHERE status = 'active'");

        // 2. Get all groups, categorized by level
        const groupsRes = await query('SELECT id, level, teacher_id FROM groups');
        const byLevel: Record<string, any[]> = {};
        groupsRes.rows.forEach(g => {
            if (!byLevel[g.level]) byLevel[g.level] = [];
            byLevel[g.level].push(g);
        });

        const weekStart = new Date();

        for (const level in byLevel) {
            const list = byLevel[level];
            // Shuffle
            for (let i = list.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [list[i], list[j]] = [list[j], list[i]];
            }

            // Pair them
            for (let i = 0; i < list.length - 1; i += 2) {
                const gA = list[i];
                const gB = list[i + 1];
                await query(
                    'INSERT INTO group_battles (id, group_a_id, group_b_id, week_start) VALUES ($1, $2, $3, $4)',
                    [uuidv4(), gA.id, gB.id, weekStart]
                );
            }
        }
        console.log('[Battle] Matching complete.');
    } catch (err) {
        console.error('[Battle] Matching error:', err);
    }
}

async function finalizeBattles() {
    try {
        console.log('[Battle] Finalizing weekly battles...');
        const activeBattles = await query("SELECT * FROM group_battles WHERE status = 'active'");

        // Reset all trophies and heroes before assigning new ones
        await query('UPDATE groups SET has_trophy = FALSE');
        await query('UPDATE students SET is_hero = FALSE');

        for (const battle of activeBattles.rows) {
            let winnerId = null;
            if (battle.score_a > battle.score_b) winnerId = battle.group_a_id;
            else if (battle.score_b > battle.score_a) winnerId = battle.group_b_id;

            // Find MVP of the winning group (or just the battle if no clear winner)
            const targetGroupId = winnerId || battle.group_a_id;
            const mvpRes = await query(`
                SELECT id FROM students 
                WHERE group_id = $1 
                ORDER BY weekly_battle_score DESC 
                LIMIT 1
            `, [targetGroupId]);

            const mvpId = mvpRes.rows[0]?.id || null;

            await query(`
                UPDATE group_battles 
                SET status = 'finished', winner_id = $1, mvp_id = $2 
                WHERE id = $3
            `, [winnerId, mvpId, battle.id]);

            if (winnerId) {
                await query('UPDATE groups SET has_trophy = TRUE WHERE id = $1', [winnerId]);
                // Notify winner group
                // (Could send Telegram notification to all students here)
            }
            if (mvpId) {
                await query('UPDATE students SET is_hero = TRUE WHERE id = $1', [mvpId]);
            }
        }

        // Bonus: reset weekly scores for everyone
        await query('UPDATE students SET weekly_battle_score = 0');
        console.log('[Battle] Finalization complete.');
    } catch (err) {
        console.error('[Battle] Finalization error:', err);
    }
}

function startSelfPinger() {
    const url = 'https://ziyokor-education.onrender.com/api/health';
    setInterval(() => {
        https.get(url, (res) => {
            console.log(`[Self-Ping] Status: ${res.statusCode}`);
        }).on('error', (err) => {
            console.error('[Self-Ping] Error:', err.message);
        });
    }, 14 * 60 * 1000);
}

function startWeeklySchedulers() {
    // Check every hour
    setInterval(() => {
        const now = new Date();
        const day = now.getDay();
        const hour = now.getHours();

        // Sunday night (21:00) -> Weekly Reports
        if (day === 0 && hour === 21) {
            sendWeeklyReports();
        }

        // Sunday night (23:00) -> Finalize Battles
        if (day === 0 && hour === 23) {
            finalizeBattles();
        }

        // Monday morning (01:00) -> Match groups for new week
        if (day === 1 && hour === 1) {
            matchGroupsForBattle();
        }
    }, 60 * 60 * 1000); // 1 hour
}


// Carousel Slides Management
app.get('/api/carousel', async (req, res) => {
    try {
        const result = await query('SELECT * FROM carousel_slides ORDER BY order_index ASC, created_at DESC');
        res.json(result.rows);
    } catch (err: any) {
        console.error('Error fetching carousel slides:', err);
        res.status(500).json({ error: 'Error fetching slides', details: err.message });
    }
});

app.post('/api/manager/carousel', requireRole('admin', 'manager'), upload.single('image'), async (req, res) => {
    try {
        const { title, description, order_index } = req.body;
        if (!req.file) return res.status(400).json({ error: 'Rasm yuklanmadi' });

        const id = uuidv4();
        const imageUrl = `/uploads/${req.file.filename}`;
        
        await query(
            'INSERT INTO carousel_slides (id, image_url, title, description, order_index) VALUES ($1, $2, $3, $4, $5)',
            [id, imageUrl, title, description, parseInt(order_index) || 0]
        );
        
        res.json({ id, image_url: imageUrl, title, description, order_index });
    } catch (err: any) {
        console.error('Error creating carousel slide:', err);
        res.status(500).json({ error: 'Xatolik', details: err.message });
    }
});

app.delete('/api/manager/carousel/:id', requireRole('admin', 'manager'), async (req, res) => {
    try {
        const { id } = req.params;
        const slideRes = await query('SELECT image_url FROM carousel_slides WHERE id = $1', [id]);
        
        if (slideRes.rowCount && slideRes.rowCount > 0) {
            const imageUrl = slideRes.rows[0].image_url;
            const filePath = path.join(__dirname, '..', 'storage', 'uploads', path.basename(imageUrl));
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await query('DELETE FROM carousel_slides WHERE id = $1', [id]);
        res.json({ success: true, id });
    } catch (err: any) {
        console.error('Error deleting carousel slide:', err);
        res.status(500).json({ error: 'Xatolik', details: err.message });
    }
});

// Global Error Handler to prevent leaking stack traces
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, async () => {
    await initDb();

    // In PM2 Cluster mode, we only want these to run on one instance (ID 0)
    // If not in PM2, NODE_APP_INSTANCE will be undefined.
    const isPrimaryInstance = process.env.NODE_APP_INSTANCE === '0' || !process.env.NODE_APP_INSTANCE;

    if (isPrimaryInstance) {
        launchBot();
        startCronJobs();
        startSelfPinger();
        startWeeklySchedulers();
        console.log(`[Singleton] Background services started on instance ${process.env.NODE_APP_INSTANCE || 0}`);
    }

    console.log(`Server instance ${process.env.NODE_APP_INSTANCE || 0} running on port ${PORT}`);
});
