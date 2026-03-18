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
import { Worker } from 'worker_threads';
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

// Database Initialization
async function initDb() {
    try {
        // Split schema into individual statements
        const statements = schema
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            await query(statement);
        }

        // Ensure game_results has total_questions (for older installs)
        await query('ALTER TABLE game_results ADD COLUMN IF NOT EXISTS total_questions INT NOT NULL DEFAULT 0;');

        // Ensure students table has contact info columns
        await query('ALTER TABLE students ADD COLUMN IF NOT EXISTS last_contacted_relative TEXT;');
        await query('ALTER TABLE students ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;');

        // Ensure groups table has extra class columns
        await query('ALTER TABLE groups ADD COLUMN IF NOT EXISTS extra_class_days TEXT[];');
        await query('ALTER TABLE groups ADD COLUMN IF NOT EXISTS extra_class_times TEXT[];');
        await query('ALTER TABLE teachers ADD COLUMN IF NOT EXISTS plain_password TEXT;');
        await query('ALTER TABLE students ADD COLUMN IF NOT EXISTS plain_password TEXT;');

        await query(`
            CREATE TABLE IF NOT EXISTS contact_logs (
                id UUID PRIMARY KEY,
                student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
                relative TEXT NOT NULL,
                contacted_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        // Extra Class Booking migration
        await query('ALTER TABLE extra_class_bookings ADD COLUMN IF NOT EXISTS is_forced BOOLEAN DEFAULT FALSE;');


        // Gamification columns migration (coins, streaks)
        await query('ALTER TABLE students ADD COLUMN IF NOT EXISTS coins INT DEFAULT 0;');
        await query('ALTER TABLE students ADD COLUMN IF NOT EXISTS streak_count INT DEFAULT 0;');
        await query('ALTER TABLE students ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;');
        await query('ALTER TABLE students ADD COLUMN IF NOT EXISTS avatar_url TEXT;');

        // Groups level migration
        await query("ALTER TABLE groups ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'Beginner';");

        // Group Battles Migration
        await query('ALTER TABLE groups ADD COLUMN IF NOT EXISTS has_trophy BOOLEAN DEFAULT FALSE;');
        await query('ALTER TABLE students ADD COLUMN IF NOT EXISTS is_hero BOOLEAN DEFAULT FALSE;');
        await query('ALTER TABLE students ADD COLUMN IF NOT EXISTS weekly_battle_score INT DEFAULT 0;');

        // Solo Quizzes Migration
        await query('ALTER TABLE solo_quizzes ADD COLUMN IF NOT EXISTS unit TEXT;');
        
        // Duel Quizzes Table Fix
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

        await query(`
            CREATE TABLE IF NOT EXISTS vocabulary_battles (
                id UUID PRIMARY KEY,
                daraja TEXT NOT NULL,
                level INT NOT NULL,
                title TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                questions JSONB NOT NULL
            );
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS telegram_questions (
                id UUID PRIMARY KEY,
                text TEXT NOT NULL,
                options JSONB NOT NULL,
                correct_index INT NOT NULL,
                level TEXT NOT NULL DEFAULT 'General',
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS group_battles(
            id UUID PRIMARY KEY,
            group_a_id UUID REFERENCES groups(id) ON DELETE CASCADE,
            group_b_id UUID REFERENCES groups(id) ON DELETE CASCADE,
            week_start DATE NOT NULL,
            score_a INT DEFAULT 0,
            score_b INT DEFAULT 0,
            status TEXT DEFAULT 'active',
            winner_id UUID REFERENCES groups(id),
            mvp_id TEXT REFERENCES students(id),
            created_at TIMESTAMP DEFAULT NOW()
        );
        `);

        // Parent ID Migration
        await query('ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_id TEXT UNIQUE;');
        await query('ALTER TABLE students ADD COLUMN IF NOT EXISTS active_theme_id UUID REFERENCES shop_items(id);');

        // Telegram Subscriber Role Migration
        await query('ALTER TABLE student_telegram_subscriptions ADD COLUMN IF NOT EXISTS role TEXT;');

        // Carousel Slides Table Migration (Ensure table exists if migration didn't run via schema.ts yet)
        await query(`
            CREATE TABLE IF NOT EXISTS carousel_slides (
                id UUID PRIMARY KEY,
                image_url TEXT NOT NULL,
                title TEXT,
                description TEXT,
                order_index INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Backfill parent_id for existing students
        const studentsWithoutParentId = await query('SELECT id FROM students WHERE parent_id IS NULL');
        for (const row of studentsWithoutParentId.rows) {
            const pid = await generateParentId();
            await query('UPDATE students SET parent_id = $1 WHERE id = $2', [pid, row.id]);
        }

        // Migration: Update groups.teacher_id foreign key to ON DELETE SET NULL
        try {
            const constraintRes = await query(`
                SELECT constraint_name 
                FROM information_schema.key_column_usage 
                WHERE table_name = 'groups' AND column_name = 'teacher_id' 
                AND table_schema = 'public';
            `);

            if (constraintRes.rowCount && constraintRes.rowCount > 0) {
                const constraintName = constraintRes.rows[0].constraint_name;
                await query(`ALTER TABLE groups DROP CONSTRAINT IF EXISTS "${constraintName}";`);
                await query(`ALTER TABLE groups ADD CONSTRAINT "${constraintName}" FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;`);
                console.log(`Database: Updated constraint ${constraintName} to ON DELETE SET NULL`);
            }
        } catch (migErr) {
            console.error('Migration error (teacher_id constraint):', migErr);
        }

        // Initialize System Settings
        await query(`
            INSERT INTO system_settings (key, value, description)
            VALUES 
                ('vocab_battle_active', 'false', 'Vocabulary Battle feature availability for students'),
                ('tg_game_all_can_join', 'false', 'Allow unregistered users to join Telegram bot games')
            ON CONFLICT (key) DO NOTHING;
        `);

        // Performance Indexes Migration
        await query('CREATE INDEX IF NOT EXISTS idx_extra_class_bookings_student ON extra_class_bookings(student_id);');
        await query('CREATE INDEX IF NOT EXISTS idx_extra_class_bookings_group ON extra_class_bookings(group_id);');
        await query('CREATE INDEX IF NOT EXISTS idx_student_purchases_student ON student_purchases(student_id);');
        await query('CREATE INDEX IF NOT EXISTS idx_duels_players ON duels(player1_id, player2_id);');
        await query('CREATE INDEX IF NOT EXISTS idx_duels_status ON duels(status);');
        await query('CREATE INDEX IF NOT EXISTS idx_groups_teacher ON groups(teacher_id);');
        await query('CREATE INDEX IF NOT EXISTS idx_student_telegram_subscriptions_chat ON student_telegram_subscriptions(telegram_chat_id);');

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

// Modular Routes
app.use('/api', apiRoutes);

// Health Check

app.post('/api/logout', (req, res) => {
    res.clearCookie('ziyokor_token');
    res.json({ success: true });
});

// Legacy Admin: Teachers and Stats routes moved to adminRoutes/adminController

// Old teacher stats routes removed

// Old manager routes removed

// Old admin management routes removed

// Old admin student routes removed

// Admin: Unit Quizzes (Routes moved/consolidated below)

// Legacy Admin: Vocab Battles, Telegram Questions, Settings, Slots moved to adminRoutes/adminController

// Legacy Manager: Shop Items moved to shopRoutes/shopController

// --- Legacy Routes migrated to modular controllers ---

// Helper functions migrated to RewardService.ts and controllers

// --- Web Vocab Battle APIs (Level Based) ---
// --- Legacy Student/Group Routes migrated to modular controllers ---

// --- Final Legacy Cleanup (Routes migrated to modular controllers) ---

function scrubPlayers(game: any, players?: any[]) {
    const list = players || game.players || [];
    if (game.isUnitQuiz) {
        return list.map((p: any) => scrubSinglePlayer(game, p));
    }
    return list;
}

function scrubSinglePlayer(game: any, p: any) {
    if (game.isUnitQuiz) {
        return {
            id: p.id,
            name: p.name,
            answeredCount: Object.entries(p.answers || {}).filter(([qIdx, a]) => {
                const isValidAnswer = a !== "" && a !== null && a !== undefined;
                let questions = game.quiz?.questions;
                if (typeof questions === 'string') {
                    try { questions = JSON.parse(questions); } catch (e) { questions = []; }
                }
                const isNotInfoSlide = (questions as any[])?.[Number(qIdx)]?.type !== 'info-slide';
                return isValidAnswer && isNotInfoSlide;
            }).length,
            status: p.status,
            isFinished: p.isFinished,
            isCheater: p.isCheater,
            avatar_url: p.avatar_url
        };
    }
    return p;
}

// Throttling mechanism for unit quiz updates
const updateThrottles: Record<string, NodeJS.Timeout | null> = {};
const pendingPlayerUpdates: Record<string, Set<string>> = {};

// AI Queue Manager for handle large-scale quizzes (like 1120 questions)
const aiCheckQueues: Record<string, { pin: string, playerId: string, qIdx: number, text: string, answer: string, type: string, acceptedAnswers?: string[] }[]> = {};
const aiQueueThrottles: Record<string, NodeJS.Timeout | null> = {};

async function enqueueAICheck(pin: string, playerId: string, qIdx: number, text: string, answer: string, type: string, acceptedAnswers?: string[]) {
    if (!aiCheckQueues[pin]) aiCheckQueues[pin] = [];
    aiCheckQueues[pin].push({ pin, playerId, qIdx, text, answer, type, acceptedAnswers });

    if (aiQueueThrottles[pin]) return;

    aiQueueThrottles[pin] = setTimeout(async () => {
        const queue = aiCheckQueues[pin];
        delete aiCheckQueues[pin];
        aiQueueThrottles[pin] = null;

        if (!queue || queue.length === 0) return;

        try {
            console.log(`[AI Queue] Processing ${queue.length} items for pin ${pin}...`);
            const results = await checkAnswersWithAIBatch(queue.map(item => ({
                text: item.text,
                studentAnswer: item.answer,
                type: item.type,
                acceptedAnswers: item.acceptedAnswers
            })));

            let modCount = 0;
            const uniquePlayerIds = new Set(queue.map(item => item.playerId));

            // Process each player's updates independently
            for (const pId of uniquePlayerIds) {
                const player = await store.getPlayer(pin, pId);
                if (!player) continue;

                let playerModded = false;
                queue.forEach((item, i) => {
                    if (item.playerId !== pId) return;
                    const aiResult = results[i];
                    if (!aiResult) return;

                    (player as any).aiFeedbackMap = (player as any).aiFeedbackMap || {};
                    (player as any).aiFeedbackMap[item.qIdx] = aiResult.feedback;

                    if (aiResult.isCorrect) {
                        if (!(player as any).partialScoreMap) (player as any).partialScoreMap = {};
                        const currentPartial = (player as any).partialScoreMap[item.qIdx] || 0;
                        if (currentPartial === 0) {
                            player.score += 1;
                            (player as any).partialScoreMap[item.qIdx] = 1;
                            playerModded = true;
                            modCount++;
                        }
                    } else if (!isCorrectResult(aiResult)) {
                        // Even if not correct, we still update feedback if changed
                        playerModded = true;
                    }
                });

                if (playerModded) {
                    await store.setPlayer(pin, player);
                    await broadcastPlayerUpdate(pin, pId);
                }
            }

            console.log(`[AI Queue] Finished batch for pin ${pin}. Updated ${modCount} scores.`);
        } catch (err) {
            console.error('[AI Queue] Background processing error:', err);
        }
    }, 4000); // 4 second wait to gather more answers
}

// Utility to check if AI result is meaningfully different for marking as modded
// Utility to check if AI result is meaningfully different for marking as modded
function isCorrectResult(aiResult: any) {
    return aiResult.isCorrect;
}

async function broadcastPlayerUpdate(pin: string, playerId?: string) {
    const metadata = await store.getGameMetadata(pin);
    if (!metadata || !metadata.hostId || metadata.hostId === 'system') return;

    if (metadata.isUnitQuiz) {
        // If it's in LOBBY status, always send full update to ensure teacher sees everyone correctly
        // Cluster-safe: Emit to the room instead of just hostId
        if (metadata.status === 'LOBBY') {
            const fullGame = await store.getGame(pin);
            if (fullGame) {
                io.to(pin).emit('player-update', scrubPlayers(fullGame));
            }
            return;
        }

        if (!pendingPlayerUpdates[pin]) pendingPlayerUpdates[pin] = new Set();
        if (playerId) {
            pendingPlayerUpdates[pin].add(playerId);
        } else {
            pendingPlayerUpdates[pin].add('ALL');
        }

        // If already scheduled, do nothing
        if (updateThrottles[pin]) return;

        // Schedule an update in 1 second (Faster feedback)
        updateThrottles[pin] = setTimeout(async () => {
            const updates = pendingPlayerUpdates[pin];
            if (!updates) return;

            try {
                if (updates.has('ALL')) {
                    const fullGame = await store.getGame(pin);
                    if (fullGame) {
                        io.to(pin).emit('player-update', scrubPlayers(fullGame));
                    }
                } else {
                    const changedPlayers: any[] = [];
                    for (const pId of Array.from(updates)) {
                        if (pId === 'ALL') continue;
                        const p = await store.getPlayer(pin, pId as string);
                        if (p) {
                            changedPlayers.push(scrubSinglePlayer(metadata, p));
                        }
                    }

                    if (changedPlayers.length > 0) {
                        io.to(pin).emit('player-update-delta', changedPlayers);
                    }
                }
            } catch (err) {
                console.error('[broadcastPlayerUpdate] Error:', err);
            } finally {
                if (pendingPlayerUpdates[pin]) {
                    pendingPlayerUpdates[pin].clear();
                }
                updateThrottles[pin] = null;
            }
        }, 1000);
    } else {
        // Normal game: send full update to room for cluster safety
        const game = await store.getGame(pin);
        if (game) {
            io.to(pin).emit('player-update', scrubPlayers(game));
        }
    }
}

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Host: Create Game
    socket.on('host-create-game', async (quizId: string) => {
        try {
            const result = await query('SELECT * FROM quizzes WHERE id = $1', [quizId]);
            if (result.rowCount === 0) {
                socket.emit('error', 'Quiz not found');
                return;
            }
            const quiz = result.rows[0];
            const pin = await generatePin();
            const game = {
                pin,
                quiz,
                hostId: socket.id,
                players: [],
                status: 'LOBBY' as 'LOBBY',
                currentQuestionIndex: -1
            };
            await store.setGame(pin, game);
            socket.join(pin);
            socket.emit('game-created', pin);
            console.log(`Game created: ${pin}`);
        } catch (err) {
            socket.emit('error', 'Database error');
        }
    });

    // Host: Create Unit Game
    socket.on('host-create-unit-game', async ({ quizId, groupId }: { quizId: string, groupId: string }) => {
        try {
            const now = Date.now();

            // 1. Clean up STALE lobbies for this group/quiz (older than 15 mins)
            const allGames = await store.getAllGames();
            for (const p of Object.keys(allGames)) {
                const g = allGames[p];
                if (g && g.isUnitQuiz && g.groupId === groupId && g.quiz?.id === quizId && g.status === 'LOBBY') {
                    const ageMs = now - (g.createdAt || 0);
                    if (ageMs > 15 * 60 * 1000) { // 15 mins
                        await store.deleteGame(p);
                        console.log(`Unit Game STALE-CLEAN: ${p} for group ${groupId}`);
                    }
                }
            }

            // 2. REUSE: Check for a RECENT lobby to reuse (for PIN stability on refresh)
            const gamesAfterClean = await store.getAllGames();
            let existingPin: string | null = null;
            for (const p of Object.keys(gamesAfterClean)) {
                const g = gamesAfterClean[p];
                if (g && g.isUnitQuiz && g.groupId === groupId && g.quiz?.id === quizId && g.status === 'LOBBY') {
                    existingPin = p;
                    break;
                }
            }

            if (existingPin) {
                const game = await store.getGame(existingPin);
                if (game) {
                    game.hostId = socket.id; // Re-bind host to current socket
                    game.createdAt = Date.now(); // Update timestamp so clients know it's a new session
                    await store.setGame(existingPin, game);
                    socket.join(existingPin);
                    socket.emit('game-created', existingPin);
                    console.log(`Unit Game REUSED: ${existingPin} for group ${groupId}`);
                    return;
                }
            }

            const result = await query('SELECT * FROM unit_quizzes WHERE id = $1', [quizId]);
            if (result.rowCount === 0) {
                socket.emit('error', 'Unit Quiz not found');
                return;
            }
            const quiz = result.rows[0];
            const pin = await generatePin();
            const game = {
                pin,
                quiz,
                hostId: socket.id,
                players: [],
                status: 'LOBBY' as 'LOBBY',
                currentQuestionIndex: -1,
                isUnitQuiz: true,
                groupId,
                createdAt: now
            };
            await store.setGame(pin, game);
            socket.join(pin);
            socket.emit('game-created', pin);
            console.log(`Unit Game created: ${pin} for group ${groupId}`);
        } catch (err) {
            console.error('[host-create-unit-game] error:', err);
            socket.emit('error', 'Database error');
        }
    });

    socket.on('host-reset-unit-lobby', async ({ pin }: { pin: string }) => {
        try {
            const game = await store.getGame(pin);
            // Delete the specific PIN game
            await store.deleteGame(pin);
            console.log(`Unit Game RESET: ${pin}`);

            if (game && game.isUnitQuiz) {
                // Also clear ANY other leaked lobbies for this group and quiz to be safe
                const allGames = await store.getAllGames();
                for (const p of Object.keys(allGames)) {
                    const g = allGames[p];
                    if (g.isUnitQuiz && g.groupId === game.groupId && g.quiz.id === game.quiz.id && g.status === 'LOBBY') {
                        await store.deleteGame(p);
                        console.log(`Unit Game RESET (Ghost Clean): ${p}`);
                    }
                }
            }
        } catch (err) {
            console.error('[host-reset-unit-lobby] error:', err);
        }
    });

    // Helper: Mark player offline on disconnect
    socket.on('disconnect', async () => {
        const pin = (socket as any).pin;
        const studentId = (socket as any).studentId || socket.id;
        if (pin && studentId) {
            const player = await store.getPlayer(pin, studentId);
            if (player) {
                player.status = 'Offline';
                await store.setPlayer(pin, player);
                await broadcastPlayerUpdate(pin, player.id);
            }
        }
    });

    // Player: Join Game (Normal)
    socket.on('player-join', async ({ pin, name }: { pin: string, name: string }) => {
        const game = await store.getGame(pin);
        if (!game) {
            socket.emit('error', 'Game not found');
            return;
        }
        if (game.status !== 'LOBBY') {
            socket.emit('error', 'Game already started');
            return;
        }

        const player: Player = {
            id: socket.id,
            name,
            score: 0,
            answers: {},
            status: 'Online'
        };
        game.players.push(player);
        await store.setGame(pin, game);
        socket.join(pin);
        (socket as any).pin = pin;

        io.to(game.hostId).emit('player-update', game.players);
        socket.emit('joined', { name, pin });
    });

    // Student: Join Unit Game (via 7-digit ID)
    socket.on('student-join', async ({ pin, studentId }: { pin: string, studentId: string }) => {
        try {
            const metadata = await store.getGameMetadata(pin);
            if (!metadata) {
                socket.emit('error', 'O\'yin topilmadi');
                return;
            }

            const result = await query('SELECT * FROM students WHERE id = $1', [studentId]);
            if (result.rowCount === 0) {
                socket.emit('error', 'O\'quvchi ID raqami topilmadi');
                return;
            }
            const student = result.rows[0];

            if (metadata.isUnitQuiz && !metadata.isDuel && metadata.groupId && String(student.group_id).toLowerCase() !== String(metadata.groupId).toLowerCase()) {
                socket.emit('error', 'Bu test sizning guruhingiz uchun emas');
                return;
            }

            (socket as any).studentId = studentId;
            (socket as any).pin = pin;
            await store.setSocket(studentId, socket.id);

            let player = await store.getPlayer(pin, studentId);
            if (player) {
                if (player.status !== 'Cheating') {
                    player.status = 'Online';
                }
                // If it's a LOBBY, we MUST reset progress to avoid carry-over from previous sessions
                if (metadata.status === 'LOBBY') {
                    player.score = 0;
                    player.answers = {};
                    (player as any).partialScoreMap = {};
                    (player as any).aiFeedbackMap = {};
                    (player as any).isFinished = false;
                }
                player.avatar_url = student.avatar_url;
            } else {
                player = {
                    id: studentId,
                    name: student.name,
                    avatar_url: student.avatar_url,
                    score: 0,
                    answers: {},
                    status: 'Online'
                };
            }

            await store.setPlayer(pin, player);
            socket.join(pin);
            socket.emit('joined', { name: student.name, pin });

            if (metadata.hostId && metadata.hostId !== 'system') {
                await broadcastPlayerUpdate(pin, studentId);
            }

            if (metadata.status === 'ACTIVE') {
                if (metadata.isUnitQuiz) {
                    let questions = metadata.quiz!.questions;
                    if (typeof questions === 'string') {
                        try { questions = JSON.parse(questions); } catch (e) { questions = []; }
                    }
                    if (metadata.quiz) {
                        const questionsForStudents = (questions as any[]).map((q, idx) => ({
                            info: q.info,
                            text: q.text,
                            options: q.options,
                            type: q.type,
                            acceptedAnswers: (q.type === 'matching' || q.type === 'vocabulary' || q.type === 'word-box') ? q.acceptedAnswers : undefined,
                            questionIndex: idx + 1,
                            totalQuestions: (questions as any[]).length
                        }));
                        socket.emit('unit-game-started', {
                            questions: questionsForStudents,
                            endTime: metadata.endTime,
                            title: metadata.quiz.title,
                            createdAt: metadata.createdAt
                        });
                    }
                } else {
                    socket.emit('game-started', { endTime: metadata.endTime, title: metadata.quiz!.title });
                }
            }
        } catch (err) {
            console.error('[student-join] error:', err);
            socket.emit('error', 'Ma\'lumotlar bazasi xatoligi');
        }
    });

    // Student: Status Update (Anti-Cheat)
    socket.on('student-status-update', async ({ pin, studentId, status }: { pin: string, studentId: string, status: 'Online' | 'Offline' | 'Cheating' }) => {
        const player = await store.getPlayer(pin, studentId || (socket as any).studentId || socket.id);
        if (player) {
            let modded = false;
            if (status === 'Cheating' && !player.isCheater) {
                player.isCheater = true;
                modded = true;
                console.log(`[Cheat Alert] Student ${studentId || player.name} flagged as cheater in game ${pin}`);
            }
            if (player.status !== 'Cheating' && status !== player.status) {
                player.status = status;
                modded = true;
            } else if (player.status === 'Cheating' && status === 'Online') {
                // Already caught cheating, don't revert status to Online
            } else if (status !== player.status) {
                player.status = status;
                modded = true;
            }

            if (modded) {
                await store.setPlayer(pin, player);
                await broadcastPlayerUpdate(pin, player.id);
            }
        }
    });

    // Host: Start Game
    socket.on('host-start-game', async ({ pin, timeLimit }: { pin: string, timeLimit: number }) => {
        const game = await store.getGame(pin);
        if (!game || game.hostId !== socket.id) return;

        game.status = 'ACTIVE';
        game.currentQuestionIndex = 0;

        let durationMinutes = timeLimit;
        if (!durationMinutes) {
            if (game.isUnitQuiz && 'time_limit' in game.quiz) {
                durationMinutes = game.quiz.time_limit || 30;
            } else {
                durationMinutes = 30;
            }
        }

        const endTime = Date.now() + durationMinutes * 60 * 1000;
        game.endTime = endTime;

        await store.setGame(pin, game);
        io.to(pin).emit('game-started', { endTime, title: game.quiz.title });

        if (game.isUnitQuiz) {
            let questions = game.quiz.questions;
            if (typeof questions === 'string') {
                try {
                    questions = JSON.parse(questions);
                } catch (e) {
                    console.error('[host-start-game] Failed to parse questions:', e);
                    questions = [];
                }
            }
            const questionsForStudents = (questions as any[]).map((q, idx) => ({
                info: q.info,
                text: q.text,
                options: q.options,
                type: q.type,
                acceptedAnswers: (q.type === 'matching' || q.type === 'vocabulary') ? q.acceptedAnswers : undefined,
                questionIndex: idx + 1,
                totalQuestions: questions.length
            }));
            io.to(pin).emit('unit-game-started', {
                questions: questionsForStudents,
                endTime,
                title: game.quiz.title,
                createdAt: game.createdAt
            });
        } else {
            await sendQuestion(pin);
        }
    });

    // Host: Next Question
    socket.on('host-next-question', async (pin: string) => {
        const game = await store.getGame(pin);
        if (!game || game.hostId !== socket.id) return;

        game.currentQuestionIndex++;
        if (game.currentQuestionIndex >= game.quiz.questions.length) {
            await store.setGame(pin, game);
            await finishGame(pin);
        } else {
            await store.setGame(pin, game);
            await sendQuestion(pin);
        }
    });

    // Host: End Game Early
    socket.on('host-end-game', async (pin: string) => {
        const game = await store.getGame(pin);
        if (!game || game.hostId !== socket.id) return;
        await finishGame(pin);
    });

    // Host: Get Game Status
    socket.on('host-get-status', async (pin: string) => {
        const game = await store.getGame(pin);
        if (!game) return;

        game.hostId = socket.id;
        await store.setGame(pin, game);
        socket.join(pin);

        if (game.status === 'ACTIVE') {
            const endTime = game.endTime;
            socket.emit('game-started', { endTime, title: game.quiz.title });

            if (game.isUnitQuiz) {
                let questions = game.quiz.questions;
                if (typeof questions === 'string') {
                    try {
                        questions = JSON.parse(questions);
                    } catch (e) {
                        console.error('[host-get-status] Failed to parse questions:', e);
                        questions = [];
                    }
                }
                const questionsForStudents = (questions as any[]).map((q, idx) => ({
                    info: q.info,
                    text: q.text,
                    options: q.options,
                    type: q.type,
                    acceptedAnswers: (q.type === 'matching' || q.type === 'vocabulary' || q.type === 'word-box') ? q.acceptedAnswers : undefined,
                    questionIndex: idx + 1,
                    totalQuestions: questions.length
                }));
                socket.emit('unit-game-started', {
                    questions: questionsForStudents,
                    endTime,
                    title: game.quiz.title,
                    createdAt: game.createdAt
                });
            } else if (game.currentQuestionIndex >= 0) {
                const q = game.quiz.questions[game.currentQuestionIndex];
                socket.emit('question-new', {
                    ...q,
                    questionIndex: game.currentQuestionIndex + 1,
                    totalQuestions: game.quiz.questions.length
                });
            }
            await broadcastPlayerUpdate(pin);
        } else if (game.status === 'FINISHED') {
            const leaderboard = [...game.players].sort((a, b) => b.score - a.score);
            socket.emit('game-over', leaderboard);
        }
    });

    // Player: Get Game Status
    socket.on('player-get-status', async ({ pin, studentId }: { pin: string, studentId?: string }) => {
        const metadata = await store.getGameMetadata(pin);
        if (!metadata) return;

        socket.join(pin);
        (socket as any).pin = pin;

        if (studentId) {
            (socket as any).studentId = studentId;
            const player = await store.getPlayer(pin, studentId);
            if (player) {
                if (player.status !== 'Cheating') {
                    player.status = 'Online';
                }
                await store.setPlayer(pin, player);
                await broadcastPlayerUpdate(pin, studentId);
            }
        }

        if (metadata.status === 'ACTIVE') {
            const endTime = metadata.endTime;
            if (metadata.isUnitQuiz) {
                let questions = metadata.quiz!.questions;
                if (typeof questions === 'string') {
                    try { questions = JSON.parse(questions); } catch (e) { questions = []; }
                }
                if (metadata.quiz) {
                    const player = studentId ? await store.getPlayer(pin, studentId) : null;
                    if (player && (player as any).isFinished) {
                        socket.emit('unit-finished', { hidden: true });
                        return;
                    }

                    const questionsForStudents = (questions as any[]).map((q, idx) => ({
                        info: q.info,
                        text: q.text,
                        options: q.options,
                        type: q.type,
                        acceptedAnswers: (q.type === 'matching' || q.type === 'vocabulary' || q.type === 'word-box') ? q.acceptedAnswers : undefined,
                        questionIndex: idx + 1,
                        totalQuestions: (questions as any[]).length
                    }));
                    socket.emit('unit-game-started', {
                        questions: questionsForStudents,
                        endTime,
                        title: metadata.quiz.title,
                        createdAt: metadata.createdAt
                    });
                }
            } else if (metadata.currentQuestionIndex !== undefined && metadata.currentQuestionIndex >= 0) {
                const q = metadata.quiz!.questions[metadata.currentQuestionIndex];
                socket.emit('question-start', {
                    ...q,
                    questionIndex: metadata.currentQuestionIndex + 1,
                    totalQuestions: metadata.quiz!.questions.length
                });
            }
        }
    });

    // Student: Finalize Unit Quiz
    socket.on('unit-player-finish', async ({ pin }: { pin: string }) => {
        console.log(`[unit-player-finish] Received from ${socket.id} for pin ${pin}`);
        const metadata = await store.getGameMetadata(pin);
        if (!metadata) {
            console.log(`[unit-player-finish] Error: Metadata for ${pin} not found`);
            socket.emit('error', 'O\'yin topilmadi');
            return;
        }

        // Allow finishing in either LOBBY or ACTIVE state for unit quizzes
        const isValidStatus = metadata.status === 'ACTIVE' || metadata.status === 'LOBBY';
        if (!metadata.isUnitQuiz || !isValidStatus) {
            console.log(`[unit-player-finish] REJECTED: pin=${pin}, isUnit=${metadata.isUnitQuiz}, status=${metadata.status}`);
            socket.emit('error', 'Test holati noto\'g\'ri (LOBBY yoki ACTIVE bo\'lishi kerak)');
            return;
        }

        const playerId = (socket as any).studentId || socket.id;
        console.log(`[unit-player-finish] Processing for player: ${playerId}`);
        const player = await store.getPlayer(pin, playerId);
        if (!player) {
            console.log(`[unit-player-finish] Error: Player ${playerId} not found in game ${pin}`);
            socket.emit('error', 'Siz ushbu o\'yinda emassiz');
            return;
        }

        (player as any).isFinished = true;
        await store.setPlayer(pin, player);

        let questions: any[] = [];
        try {
            const rawQuestions = metadata.quiz?.questions;
            if (Array.isArray(rawQuestions)) {
                questions = rawQuestions;
            } else if (typeof rawQuestions === 'string') {
                questions = JSON.parse(rawQuestions);
            }
        } catch (e) {
            console.error('[unit-player-finish] Questions parse error:', e);
        }

        const correctAnswers = questions.map(q => ({
            type: q.type,
            correctIndex: q.correctIndex,
            acceptedAnswers: q.acceptedAnswers
        }));

        await broadcastPlayerUpdate(pin, player.id);
        console.log(`[unit-player-finish] Success for ${player.name} (${playerId}). Results hidden from student UI.`);
        socket.emit('unit-finished', { hidden: true });
    });

    // Student: Register socket (for Duel Lobby presence)
    socket.on('student-register', async ({ studentId }: { studentId: string }) => {
        (socket as any).studentId = studentId;
        await store.setSocket(studentId, socket.id);
        console.log(`[Register] Student ${studentId} registered with socket ${socket.id}`);
    });

    // Duel: Invitation
    socket.on('duel-invite', async ({ targetStudentId, studentName }: { targetStudentId: string, studentName: string }) => {
        const targetSocketId = await store.getSocket(targetStudentId);
        if (targetSocketId) {
            io.to(targetSocketId).emit('duel-invited', { fromId: (socket as any).studentId, fromName: studentName });
            console.log(`[Duel] Invitation from ${studentName} to ${targetStudentId}`);
        } else {
            socket.emit('error', 'O\'quvchi hozirda onlayn emas');
        }
    });

    socket.on('duel-accept', async ({ fromId }: { fromId: string }) => {
        const fromSocketId = await store.getSocket(fromId);
        const studentId = (socket as any).studentId;
        if (!fromSocketId || !studentId) return;

        try {
            const studentRes = await query('SELECT g.level FROM students s JOIN groups g ON s.group_id = g.id WHERE s.id = $1', [studentId]);
            const level = studentRes.rows[0]?.level || 'Beginner';

            // Check for duel-specific questions first
            const duelQuizRes = await query('SELECT * FROM duel_quizzes WHERE daraja = $1 AND is_active = TRUE ORDER BY RANDOM() LIMIT 1', [level]);
            let quiz;
            if ((duelQuizRes.rowCount || 0) > 0) {
                quiz = duelQuizRes.rows[0];
            } else {
                // Fallback to unit quizzes
                const unitQuizRes = await query('SELECT * FROM unit_quizzes WHERE level = $1 ORDER BY RANDOM() LIMIT 1', [level]);
                if (unitQuizRes.rowCount === 0) {
                    return socket.emit('error', { message: 'No questions found for your level' });
                }
                quiz = unitQuizRes.rows[0];
            }
            const quizId = quiz.id;

            const duelId = uuidv4();
            await query(
                'INSERT INTO duels (id, player1_id, player2_id, quiz_id, status) VALUES ($1, $2, $3, $4, $5)',
                [duelId, fromId, studentId, quizId, 'active']
            );

            const pin = await generatePin();
            const fullQuiz = (await query('SELECT * FROM unit_quizzes WHERE id = $1', [quizId])).rows[0];

            const game = {
                pin,
                quiz: fullQuiz,
                hostId: 'system',
                players: [],
                status: 'ACTIVE' as 'ACTIVE',
                currentQuestionIndex: 0,
                isUnitQuiz: true,
                isDuel: true,
                duelId,
                createdAt: Date.now()
            };
            await store.setGame(pin, game);

            io.to(socket.id).emit('duel-started', { pin, duelId });
            io.to(fromSocketId).emit('duel-started', { pin, duelId });
        } catch (err) {
            socket.emit('error', 'Duelni boshlashda xatolik');
        }
    });

    // Player/Student: Submit Answer
    socket.on('player-answer', async ({ pin, answer, questionIndex }: { pin: string, answer: string | number, questionIndex?: number }, callback?: (res: { success: boolean, error?: string }) => void) => {
        const metadata = await store.getGameMetadata(pin);

        if (!metadata) {
            if (callback) callback({ success: false, error: 'O\'yin topilmadi' });
            return;
        }

        // Allow answers during LOBBY for Unit Quizzes to prevent "Saving..." hang if teacher hasn't pressed Start yet
        const isAllowedState = metadata.status === 'ACTIVE';

        if (!isAllowedState) {
            if (callback) callback({ success: false, error: 'O\'yin hali boshlanmagan' });
            return;
        }

        const playerId = (socket as any).studentId || socket.id;
        const player = await store.getPlayer(pin, playerId);
        if (!player) {
            if (callback) callback({ success: false, error: 'O\'quvchi topilmadi' });
            return;
        }

        const qIdx = metadata.isUnitQuiz && questionIndex !== undefined ? questionIndex : metadata.currentQuestionIndex;
        if (qIdx === undefined || qIdx < 0 || qIdx >= (metadata.quiz!.questions.length)) {
            if (callback) callback({ success: false, error: 'Savol raqami noto\'g\'ri' });
            return;
        }

        const question = metadata.quiz!.questions[qIdx];
        if (!(player as any).partialScoreMap) (player as any).partialScoreMap = {};
        const prevPartialScore = (player as any).partialScoreMap[qIdx] || 0;

        let currentScore = 0;
        const textTypes = ['text-input', 'fill-blank', 'find-mistake', 'rewrite', 'word-box', 'matching', 'vocabulary'];
        const isTextInput = textTypes.slice(0, 4).includes(question.type || '');

        if (question.type === 'matching' || question.type === 'word-box') {
            currentScore = countCorrectParts(String(answer), question.acceptedAnswers || []);
        } else if (textTypes.includes(question.type || '')) {
            if (checkAnswer(String(answer), question.acceptedAnswers || [])) {
                currentScore = 1;
            }
        } else {
            const ansIdx = Number(answer);
            if (ansIdx === question.correctIndex) {
                currentScore = 1;
            }
        }

        player.answers[qIdx] = answer;
        player.score = (player.score || 0) - prevPartialScore + currentScore;
        (player as any).partialScoreMap[qIdx] = currentScore;

        await store.setPlayer(pin, player);

        if (callback) callback({ success: true });

        if (metadata.isUnitQuiz) {
            await broadcastPlayerUpdate(pin, player.id);
        }

        if (isTextInput && currentScore === 0 && answer) {
            enqueueAICheck(pin, playerId, qIdx, question.text, String(answer), question.type || 'text-input', question.acceptedAnswers)
                .catch(e => console.error('[AI-Queue-Error]', e));
        }

        if (!metadata.isUnitQuiz) {
            // Background count for MC questions
            const game = await store.getGame(pin);
            if (game) {
                const answeredCount = game.players.filter(p => p.answers[game.currentQuestionIndex] !== undefined).length;
                io.to(game.hostId).emit('answers-count', answeredCount);
            }
        }
    });

    socket.on('player-sync-answers', async ({ pin, answers }: { pin: string, answers: Record<string, string | number> }, callback?: (res: { success: boolean, error?: string }) => void) => {
        const metadata = await store.getGameMetadata(pin);
        if (!metadata || metadata.status !== 'ACTIVE') return;

        const playerId = (socket as any).studentId || socket.id;
        const player = await store.getPlayer(pin, playerId);
        if (!player) return;

        let hasUpdates = false;
        if (!(player as any).partialScoreMap) (player as any).partialScoreMap = {};

        const questions = metadata.quiz!.questions;

        for (const [qIdxStr, answer] of Object.entries(answers)) {
            const qIdx = parseInt(qIdxStr);
            if (isNaN(qIdx) || qIdx < 0 || qIdx >= questions.length) continue;

            if (player.answers[qIdx] === undefined && answer !== undefined && answer !== null) {
                const question = questions[qIdx];
                let currentScore = 0;
                const textTypes = ['text-input', 'fill-blank', 'find-mistake', 'rewrite', 'word-box', 'matching', 'vocabulary'];

                if (question.type === 'matching' || question.type === 'word-box') {
                    currentScore = countCorrectParts(String(answer), question.acceptedAnswers || []);
                } else if (textTypes.includes(question.type || '')) {
                    if (checkAnswer(String(answer), question.acceptedAnswers || [])) {
                        currentScore = 1;
                    } else if (answer) {
                        enqueueAICheck(pin, playerId, qIdx, question.text, String(answer), question.type || 'text-input')
                            .catch(e => console.error('[AI-Queue-Error]', e));
                    }
                } else {
                    const ansIdx = Number(answer);
                    if (ansIdx === question.correctIndex) {
                        currentScore = 1;
                    }
                }

                player.answers[qIdx] = answer;
                player.score = (player.score || 0) + currentScore;
                (player as any).partialScoreMap[qIdx] = currentScore;
                hasUpdates = true;
            }
        }

        if (hasUpdates) {
            await store.setPlayer(pin, player);
            if (metadata.isUnitQuiz) {
                await broadcastPlayerUpdate(pin, player.id);
            } else {
                const game = await store.getGame(pin);
                if (game) {
                    const answeredCount = game.players.filter(p => p.answers[game.currentQuestionIndex] !== undefined).length;
                    io.to(game.hostId).emit('answers-count', answeredCount);
                }
            }
        }

        if (callback) callback({ success: true });
    });
});

// Helper for offloading PDF generation to a Worker Thread
function generatePDFInWorker(quiz: any, players: any, groupName: string, teacherName: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        try {
            const isTS = __filename.endsWith('.ts') || !!(process as any)._preload_modules?.includes('ts-node/register');
            const workerScript = path.join(__dirname, 'worker', isTS ? 'pdfWorker.ts' : 'pdfWorker.js');

            console.log(`[generatePDFInWorker] Script: ${workerScript}, mode: ${isTS ? 'TS' : 'JS'}`);

            const worker = new Worker(workerScript, {
                workerData: { quiz, players, groupName, teacherName },
                execArgv: isTS ? ['--loader', 'ts-node/esm'] : []
            });

            worker.on('message', (msg) => {
                if (msg.success) {
                    // Ensure we have a Buffer, even if passed as Uint8Array/Object in some environments
                    const buffer = Buffer.isBuffer(msg.pdfBuffer) ? msg.pdfBuffer : Buffer.from(msg.pdfBuffer);
                    resolve(buffer);
                }
                else reject(new Error(msg.error));
            });
            worker.on('error', reject);
            worker.on('exit', (code) => {
                if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
            });
        } catch (err) {
            reject(err);
        }
    });
}

async function finishGame(pin: string) {
    const game = await store.getGame(pin);
    if (!game) return;

    game.status = 'FINISHED';
    await store.setGame(pin, game);
    const leaderboard = [...game.players].sort((a, b) => b.score - a.score);
    if (game.isUnitQuiz) {
        const hiddenLeaderboard = leaderboard.map(p => ({ ...p, score: 0 }));

        // Targeted delivery: Real to host, Hidden to room
        if (game.hostId && game.hostId !== 'system') {
            io.to(game.hostId).emit('game-over', leaderboard);
        }

        // Filter out host if possible, or just emit hidden to pin (host will get both, 
        // but we'll emit real one after to be sure or assume host handles it)
        // Actually, to be safe, emit hidden to everyone then real to host
        io.to(pin).emit('game-over', hiddenLeaderboard);
        if (game.hostId && game.hostId !== 'system') {
            io.to(game.hostId).emit('game-over', leaderboard);
        }
    } else {
        io.to(pin).emit('game-over', leaderboard);
    }

    if (game.isUnitQuiz) {
        io.to(pin).emit('unit-finished', { hidden: true });
    }

    if (game.isDuel && game.duelId) {
        const winnerId = leaderboard[0]?.score > (leaderboard[1]?.score || 0) ? leaderboard[0].id : null;
        const player1 = game.players[0];
        const player2 = game.players[1];
        await query(
            'UPDATE duels SET player1_score = $1, player2_score = $2, winner_id = $3, status = $4 WHERE id = $5',
            [player1?.score || 0, player2?.score || 0, winnerId, 'completed', game.duelId]
        );
    }

    if (game.isUnitQuiz && game.groupId) {
        try {
            const resultId = uuidv4();
            
            // Robust parsing for questions
            let questions: any[] = [];
            try {
                if (Array.isArray(game.quiz.questions)) {
                    questions = game.quiz.questions;
                } else if (typeof game.quiz.questions === 'string') {
                    questions = JSON.parse(game.quiz.questions);
                }
            } catch (e) {
                console.error('[finishGame] Error parsing quiz.questions:', e);
                questions = [];
            }

            let totalPossibleScore = 0;
            questions.forEach((q: any) => {
                if (q.type === 'info-slide') return;
                if (q.type === 'matching' || q.type === 'word-box') {
                    totalPossibleScore += q.acceptedAnswers?.length || 0;
                } else {
                    totalPossibleScore += 1;
                }
            });
            
            console.log(`[finishGame] Saving results for ${game.players.length} players. Total questions: ${questions.length}`);
            
            await query(
                'INSERT INTO game_results (id, group_id, quiz_title, total_questions, player_results) VALUES ($1, $2, $3, $4, $5)',
                [resultId, game.groupId, game.quiz.title, totalPossibleScore, JSON.stringify(game.players)]
            );

            const groupRes = await query('SELECT name, teacher_id FROM groups WHERE id = $1', [game.groupId]);
            if (groupRes.rowCount && groupRes.rowCount > 0) {
                const group = groupRes.rows[0];
                const teacherRes = await query('SELECT name, telegram_chat_id FROM teachers WHERE id = $1', [group.teacher_id]);
                const teacherName = teacherRes.rowCount && teacherRes.rowCount > 0 ? teacherRes.rows[0].name : 'Noma\'lum';

                let pdfBuffer: Buffer;
                try {
                    pdfBuffer = await generatePDFInWorker(game.quiz, game.players, group.name, teacherName);
                } catch (workerErr) {
                    console.error('[finishGame] Worker PDF failed, falling back to main thread:', workerErr);
                    pdfBuffer = await generateQuizResultPDF(game.quiz, game.players, group.name, teacherName);
                }

                try {
                    const sanitizedGroupName = group.name.replace(/[^a-zA-Z0-9]/g, '_');
                    const filename = `Result_${sanitizedGroupName}_${Date.now()}.pdf`;
                    const filePath = path.join(RESULTS_DIR, filename);
                    fs.writeFileSync(filePath, pdfBuffer);
                    console.log(`[finishGame] PDF saved to server storage: ${filePath}`);
                } catch (saveErr) {
                    console.error('[finishGame] Failed to save PDF to storage:', saveErr);
                }

                if (teacherRes.rowCount && teacherRes.rowCount > 0 && teacherRes.rows[0].telegram_chat_id) {
                    try {
                        const sanitizedGroupName = group.name.replace(/[^a-zA-Z0-9]/g, '_');
                        const filename = `Result_${sanitizedGroupName}_${Date.now()}.pdf`;
                        const chatId = teacherRes.rows[0].telegram_chat_id;

                        if (!(pdfBuffer instanceof Buffer) && !Buffer.isBuffer(pdfBuffer)) {
                            pdfBuffer = Buffer.from(pdfBuffer as any);
                        }

                        console.log(`[finishGame] Attempting to send PDF to teacher (Chat: ${chatId}, File: ${filename}, BufferSize: ${pdfBuffer.length})`);

                        await bot.telegram.sendDocument(chatId, {
                            source: pdfBuffer,
                            filename: filename
                        }, {
                            caption: `📊 <b>${game.quiz.title}</b> natijalari\n🏫 Guruh: ${group.name}`,
                            parse_mode: 'HTML'
                        });
                        console.log(`[finishGame] PDF successfully sent to teacher ${chatId}.`);
                    } catch (e: any) {
                        console.error(`[finishGame] PDF send error to teacher:`, e);
                        if (e.description) console.error(`[finishGame] Telegram API Error Description: ${e.description}`);
                        if (e.code === 'ETIMEDOUT' || e.code === 'ECONNRESET') {
                            console.error(`[finishGame] CRITICAL: Telegram API is unreachable! Check internet on server.`);
                        }
                    }
                }

                // Send to Manager
                const managerRes = await query("SELECT telegram_chat_id FROM teachers WHERE phone = '998947212531'");
                if (managerRes.rowCount && managerRes.rows[0].telegram_chat_id) {
                    try {
                        const sanitizedGroupName = group.name.replace(/[^a-zA-Z0-9]/g, '_');
                        await bot.telegram.sendDocument(managerRes.rows[0].telegram_chat_id, {
                            source: pdfBuffer,
                            filename: `Result_${sanitizedGroupName}_${Date.now()}.pdf`
                        }, {
                            caption: `📊 <b>${game.quiz.title}</b> (Menejer uchun)\n🏫 Guruh: ${group.name}\n👤 O'qituvchi: ${teacherName}`,
                            parse_mode: 'HTML'
                        });
                    } catch (e) {
                        console.error('[finishGame] Manager PDF send error:', e);
                    }
                }

                bulkAwardRewards(game.players);

                (async () => {
                    for (const player of game.players) {
                        try {
                            const subRes = await query('SELECT telegram_chat_id FROM student_telegram_subscriptions WHERE student_id = $1', [player.id]);
                            for (const sub of subRes.rows) {
                                const sanitizedGroupName = group.name.replace(/[^a-zA-Z0-9]/g, '_');
                                await bot.telegram.sendDocument(sub.telegram_chat_id, {
                                    source: pdfBuffer,
                                    filename: `Result_${sanitizedGroupName}_${Date.now()}.pdf`
                                }, {
                                    caption: `📊 <b>${game.quiz.title}</b> natijalari\n🏫 Guruh: ${group.name}\n👤 O'quvchi: ${player.name}`,
                                    parse_mode: 'HTML'
                                });
                            }
                        } catch (e) {
                            console.error(`[finishGame] PDF send subscriber error for ${player.name}:`, e);
                        }
                    }
                })();
            }
        } catch (err) {
            console.error('[finishGame] Error:', err);
        }
    }
}

async function sendQuestion(pin: string) {
    const game = await store.getGame(pin);
    if (!game) return;

    const question = game.quiz.questions[game.currentQuestionIndex];
    const timeLimit = game.timePerQuestion || question.timeLimit || 20;

    io.to(game.hostId).emit('question-new', {
        ...question,
        timeLimit,
        questionIndex: game.currentQuestionIndex + 1,
        totalQuestions: game.quiz.questions.length
    });

    const questionDataForPlayer: any = {
        info: question.info,
        questionIndex: game.currentQuestionIndex + 1,
        timeLimit,
        type: question.type
    };

    const advancedTypes = ['text-input', 'fill-blank', 'find-mistake', 'rewrite', 'word-box', 'info-slide'];
    if (advancedTypes.includes(question.type || '')) {
        questionDataForPlayer.text = question.text;
        questionDataForPlayer.options = question.options;
    } else {
        questionDataForPlayer.optionsCount = (question.options || []).length;
    }

    io.to(pin).except(game.hostId).emit('question-start', questionDataForPlayer);
}

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
