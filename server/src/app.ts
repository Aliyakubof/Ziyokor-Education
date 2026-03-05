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
import { games, generatePin, generateStudentId, generateParentId, studentSockets } from './store';
import { query } from './db';
import { schema } from './schema';
import { Player, Question } from './types';
import { bot, launchBot, notifyTeacher, notifyStudentSubscribers, sendWeeklyReports } from './bot';
import { generateQuizResultPDF } from './pdfGenerator';
import { normalizeAnswer, checkAnswer, countCorrectParts } from './utils';
import { checkAnswerWithAI } from './aiChecker';
import { startCronJobs } from './cron';

const app = express();
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'https://zeducation.uz',
    'https://www.zeducation.uz',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost',
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

// Apply global response payload compression (GZip) - Reduces JSON payload sizes down ~70%
app.use(compression());

// Limit payload size to 50mb (increased to allow saving large quizzes)
app.use(express.json({ limit: '50mb' }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

const ADMIN_ID = '00000000-0000-0000-0000-000000000000';
const MANAGER_ID = '00000000-0000-0000-0000-000000000001';

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

        await query(`
            CREATE TABLE IF NOT EXISTS contact_logs (
                id UUID PRIMARY KEY,
                student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
                relative TEXT NOT NULL,
                contacted_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);


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

        // Telegram Subscriber Role Migration
        await query('ALTER TABLE student_telegram_subscriptions ADD COLUMN IF NOT EXISTS role TEXT;');

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
            await query(
                'INSERT INTO teachers (id, name, phone, password) VALUES ($1, $2, $3, $4)',
                [ADMIN_ID, 'Admin', '998901234567', '4567']
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
            await query(
                'INSERT INTO teachers (id, name, phone, password) VALUES ($1, $2, $3, $4)',
                [MANAGER_ID, 'Menejer', '998947212531', '2531']
            );
            console.log('Manager record created in teachers table');
        }
    } catch (err) {
        console.error('Error ensuring manager exists:', err);
    }
}

// Health Check
app.get('/api/health', async (req, res) => {
    try {
        const result = await query('SELECT NOW()');
        res.json({
            status: 'ok',
            time: result.rows[0].now,
            env: process.env.NODE_ENV || 'development'
        });
    } catch (err: any) {
        console.error('Database connection error:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// Authentication
app.post('/api/login', async (req, res) => {
    const { phone: rawPhone, password } = req.body;
    const phone = String(rawPhone || '').replace(/\D/g, '');

    // Hardcoded Admin
    if (phone === '998901234567' && password === '4567') {
        return res.json({
            user: { id: ADMIN_ID, name: 'Admin', phone: '998901234567' },
            role: 'admin'
        });
    }

    // Hardcoded Manager
    if (phone === '998947212531' && password === '2531') {
        return res.json({
            token: 'mock-manager-token',
            user: { id: MANAGER_ID, name: 'Menejer', phone: '998947212531' },
            role: 'manager'
        });
    }

    // Teacher Login from Database
    try {
        const result = await query(
            'SELECT id, name, phone, password FROM teachers WHERE REPLACE(phone, \'+\', \'\') = $1',
            [phone]
        );

        if (result.rowCount && result.rowCount > 0) {
            const teacher = result.rows[0];
            const match = await bcrypt.compare(password, teacher.password);

            // Allow fallback if it's not hashed yet (before migration) or if perfectly matched
            if (match || password === teacher.password) {
                // Return teacher payload without password
                const { password: _, ...teacherPayload } = teacher;
                return res.json({
                    user: teacherPayload,
                    role: 'teacher'
                });
            }
        }

        res.status(401).json({ error: 'Telefon raqam yoki parol noto\'g\'ri' });
    } catch (err) {
        console.error('Teacher login error:', err);
        res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
    }
});

// Admin: Teachers
app.post('/api/admin/teachers', async (req, res) => {
    try {
        const { name, phone, password } = req.body;
        // Use provided password or fallback to last 4 digits of phone
        const rawPassword = password || phone.slice(-4);
        const hashedPassword = await bcrypt.hash(rawPassword, 10);
        const id = uuidv4();
        await query(
            'INSERT INTO teachers (id, name, phone, password) VALUES ($1, $2, $3, $4)',
            [id, name, phone, hashedPassword]
        );
        res.json({ id, name, phone, password: hashedPassword });
    } catch (err) {
        console.error('Error creating teacher:', err);
        res.status(500).json({ error: 'Error creating teacher' });
    }
});

app.put('/api/admin/teachers/:id', async (req, res) => {
    try {
        const { name, phone, password } = req.body;
        const { id } = req.params;

        // Build update query dynamically based on provided fields? 
        // For simplicity, we expect all fields or at least some. 
        // Let's update all provided fields.
        const finalPassword = password?.startsWith('$2') ? password : await bcrypt.hash(password, 10);

        await query(
            'UPDATE teachers SET name = $1, phone = $2, password = $3 WHERE id = $4',
            [name, phone, finalPassword, id]
        );

        res.json({ id, name, phone, password: finalPassword });
    } catch (err) {
        console.error('Error updating teacher:', err);
        res.status(500).json({ error: 'Error updating teacher' });
    }
});

app.delete('/api/admin/teachers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await query('DELETE FROM teachers WHERE id = $1', [id]);
        res.json({ success: true, id });
    } catch (err) {
        console.error('Error deleting teacher:', err);
        res.status(500).json({ error: 'Error deleting teacher' });
    }
});

// Manager Dashboard API Endpoints
app.get('/api/manager/teachers', async (req, res) => {
    try {
        console.log('Manager teachers request received');
        const result = await query(`
            SELECT 
                t.*, 
                COUNT(DISTINCT g.id) as group_count,
                COUNT(DISTINCT s.id) as student_count
            FROM teachers t
            LEFT JOIN groups g ON t.id = g.teacher_id
            LEFT JOIN students s ON g.id = s.group_id
            GROUP BY t.id
            ORDER BY t.name ASC
        `);
        console.log(`Query successful, fetched ${result.rowCount} teachers`);
        res.json(result.rows);
    } catch (err: any) {
        console.error('Error in /api/manager/teachers:', err);
        res.status(500).json({ error: 'Error fetching teachers lists', details: err.message });
    }
});

app.get('/api/manager/teachers/:teacherId/groups', async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                g.*, 
                COUNT(s.id) as student_count
            FROM groups g
            LEFT JOIN students s ON g.id = s.group_id
            WHERE g.teacher_id = $1
            GROUP BY g.id
            ORDER BY g.name ASC
        `, [req.params.teacherId]);
        res.json(result.rows);
    } catch (err: any) {
        console.error('Error fetching manager groups:', err);
        res.status(500).json({ error: 'Error fetching groups', details: err.message });
    }
});

app.get('/api/manager/groups/:groupId/results', async (req, res) => {
    try {
        const result = await query(
            'SELECT * FROM game_results WHERE group_id = $1 ORDER BY created_at DESC',
            [req.params.groupId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching manager group results:', err);
        res.status(500).json({ error: 'Error fetching group results' });
    }
});

app.get('/api/manager/groups/:groupId/students', async (req, res) => {
    try {
        const result = await query(
            'SELECT id, name, phone, parent_name, parent_phone, last_contacted_at, last_contacted_relative, coins FROM students WHERE group_id = $1 ORDER BY name ASC',
            [req.params.groupId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching manager group students:', err);
        res.status(500).json({ error: 'Error fetching group students' });
    }
});

app.get('/api/admin/teachers', async (req, res) => {
    try {
        const result = await query('SELECT * FROM teachers');
        res.json(result.rows);
    } catch (err: any) {
        console.error('Error fetching teachers:', err);
        res.status(500).json({ error: 'Error fetching teachers', details: err.message });
    }
});

app.get('/api/admin/groups', async (req, res) => {
    try {
        const result = await query(`
            SELECT g.*, t.name as teacher_name 
            FROM groups g 
            LEFT JOIN teachers t ON g.teacher_id = t.id
            `);
        res.json(result.rows);
    } catch (err: any) {
        console.error('Error fetching admin groups:', err);
        res.status(500).json({ error: 'Error fetching groups', details: err.message });
    }
});

// Admin: Students
app.get('/api/admin/students', async (req, res) => {
    try {
        const result = await query(`
            SELECT s.*, g.name as group_name, t.name as teacher_name
            FROM students s
            LEFT JOIN groups g ON s.group_id = g.id
            LEFT JOIN teachers t ON g.teacher_id = t.id
            ORDER BY s.name ASC
            `);
        res.json(result.rows);
    } catch (err: any) {
        console.error('Error fetching admin students:', err);
        res.status(500).json({ error: 'Error fetching students', details: err.message });
    }
});

app.put('/api/admin/students/:id/password', async (req, res) => {
    try {
        const { password } = req.body;
        const { id } = req.params;
        const hashedPassword = await bcrypt.hash(password, 10);
        await query('UPDATE students SET password = $1 WHERE id = $2', [hashedPassword, id]);
        res.json({ success: true, id, password: hashedPassword });
    } catch (err: any) {
        console.error('Error updating student password:', err);
        res.status(500).json({ error: 'Error updating student password' });
    }
});

// Admin: Unit Quizzes (Routes moved/consolidated below)


app.get('/api/student/quizzes', async (req, res) => {
    try {
        const { studentId } = req.query;
        if (!studentId) return res.status(400).json({ error: 'Student ID missing' });

        // Get student's group level
        const studentRes = await query(`
            SELECT g.level 
            FROM students s 
            JOIN groups g ON s.group_id = g.id 
            WHERE s.id = $1
            `, [studentId]);

        if (studentRes.rowCount === 0) return res.status(404).json({ error: 'Student or group not found' });
        const level = studentRes.rows[0].level;

        // Fetch quizzes for this level
        const result = await query('SELECT id, title, unit, level, time_limit FROM unit_quizzes WHERE level = $1', [level]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching level quizzes' });
    }
});

app.post('/api/student/quiz/submit', async (req, res) => {
    try {
        const { studentId, quizId, answers } = req.body; // answers is { [qIdx]: val }

        const quizRes = await query('SELECT * FROM unit_quizzes WHERE id = $1', [quizId]);
        if (quizRes.rowCount === 0) return res.status(404).json({ error: 'Quiz not found' });
        const quiz = quizRes.rows[0];
        const questions = quiz.questions;

        let score = 0;
        const results = [];

        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            const studentAns = answers[i];
            const textTypes = ['text-input', 'fill-blank', 'find-mistake', 'rewrite']; // word-box removed from strict textTypes

            let isCorrect = false;
            let aiResult = null;
            let currentScore = 0;

            if (q.type === 'matching' || q.type === 'word-box') {
                const partsCorrect = countCorrectParts(studentAns, q.acceptedAnswers || []);
                const totalParts = q.acceptedAnswers ? q.acceptedAnswers.length : 1;

                // For partial scoring UI (1 pt per correct part instead of 100 for all)
                currentScore = partsCorrect;
                score += currentScore;

                if (partsCorrect === totalParts && totalParts > 0) {
                    isCorrect = true;
                }
            } else if (textTypes.includes(q.type)) {
                if (checkAnswer(studentAns || "", q.acceptedAnswers || [])) {
                    isCorrect = true;
                    currentScore = 1;
                    score += 1;
                } else if (!isCorrect && studentAns) {
                    // Try AI checking for potentially complex answers
                    aiResult = await checkAnswerWithAI(q.text, studentAns, q.type);
                    if (aiResult.isCorrect) {
                        isCorrect = true;
                        currentScore = 1;
                        score += 1;
                    }
                }
            } else {
                if (Number(studentAns) === q.correctIndex) {
                    isCorrect = true;
                    currentScore = 1;
                    score += 1;
                }
            }

            results.push({
                question: q.text,
                studentAnswer: studentAns,
                isCorrect,
                correctAnswer: q.type === 'multiple-choice' ? q.options[q.correctIndex] : q.acceptedAnswers?.[0],
                feedback: aiResult?.feedback || (isCorrect ? "Barakalla! To'g'ri." : "Afsuski, noto'g'ri.")
            });
        }

        // Award rewards
        await awardRewards(studentId, score);

        // Notify Teacher about Solo Quiz Result
        try {
            const teacherRes = await query(`
                SELECT t.telegram_chat_id, s.name as student_name, g.name as group_name
                FROM students s
                JOIN groups g ON s.group_id = g.id
                JOIN teachers t ON g.teacher_id = t.id
                WHERE s.id = $1
            `, [studentId]);

            if (teacherRes.rows[0]?.telegram_chat_id) {
                const { telegram_chat_id, student_name, group_name } = teacherRes.rows[0];

                // Calculate max possible score:
                let maxScore = 0;
                questions.forEach((question: any) => {
                    if (question.type === 'matching' || question.type === 'word-box') {
                        maxScore += question.acceptedAnswers ? question.acceptedAnswers.length : 1;
                    } else {
                        maxScore += 1;
                    }
                });

                const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
                const status = percentage > 59 ? "(O'tdi ✅)" : "(O'tmadi ❌)";
                await notifyTeacher(telegram_chat_id, `🎯 <b>Mashq tugatildi!(Solo Mode) </b>\n👤 O'quvchi: ${student_name}\n🏫 Guruh: ${group_name}\n📝 Test: ${quiz.title}\n📊 Natija: ${score} / ${maxScore} ball (${percentage}%) ${status}`);
            }
        } catch (e) {
            console.error('Error notifying teacher about solo quiz:', e);
        }

        // Send back true percentage calculation to frontend
        let maxScore = 0;
        questions.forEach((question: any) => {
            if (question.type === 'matching' || question.type === 'word-box') {
                maxScore += question.acceptedAnswers ? question.acceptedAnswers.length : 1;
            } else {
                maxScore += 1;
            }
        });
        const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
        res.json({ score, results, percentage });
    } catch (err) {
        console.error('Solo Quiz Submission Error:', err);
        res.status(500).json({ error: 'Submission failed' });
    }
});

// --- Web Vocab Battle APIs ---
app.get('/api/student/vocab-battle/generate', async (req, res) => {
    try {
        const { studentId, count = 15 } = req.query;
        if (!studentId) return res.status(400).json({ error: 'Student ID missing' });

        // Get student's group level
        const studentRes = await query(`
            SELECT g.level 
            FROM students s 
            JOIN groups g ON s.group_id = g.id 
            WHERE s.id = $1
        `, [studentId]);

        if (studentRes.rowCount === 0) return res.status(404).json({ error: 'Student or group not found' });
        const level = studentRes.rows[0].level;

        // Fetch all questions for this level
        const result = await query('SELECT questions FROM unit_quizzes WHERE level = $1', [level]);
        const allQuestions: Question[] = result.rows.flatMap(r => r.questions);

        // Filter valid logic to text-input only (vocabulary)
        const vocabQuestions = allQuestions.filter(q => q.type === 'text-input' && q.acceptedAnswers && q.acceptedAnswers.length > 0);

        if (vocabQuestions.length === 0) {
            return res.status(404).json({ error: 'Bu daraja uchun Lug\'at savollari topilmadi.' });
        }

        const allAnswers = vocabQuestions.flatMap(q => q.acceptedAnswers || []);

        const transformed = vocabQuestions.map(q => {
            const correct = q.acceptedAnswers![0];
            let wrongPool = allAnswers.filter(item => item && item !== correct);
            if (new Set(wrongPool).size < 3) {
                wrongPool.push('is', 'are', 'do', 'does', 'have', 'has', 'in', 'on', 'at', 'olma', 'kitob', 'ruchka', 'daftar', 'maktab');
            }
            wrongPool = Array.from(new Set(wrongPool)).sort(() => 0.5 - Math.random());
            const options = [correct, ...wrongPool.slice(0, 3)].sort(() => 0.5 - Math.random());

            return {
                text: q.text,
                options,
                correctIndex: options.indexOf(correct)
            };
        });

        // Pick requested `count` (15) random questions
        const selected = transformed.sort(() => 0.5 - Math.random()).slice(0, Number(count));

        res.json({ questions: selected });
    } catch (err) {
        console.error('Error generating vocab battle:', err);
        res.status(500).json({ error: 'Failed to generate battle' });
    }
});

app.post('/api/student/vocab-battle/submit', async (req, res) => {
    try {
        const { studentId, totalXp } = req.body;
        if (!studentId || typeof totalXp !== 'number') {
            return res.status(400).json({ error: 'Invalid data' });
        }

        const coinsEarned = Math.max(1, Math.round(totalXp * 0.05)); // 5% of XP as coins

        await query('UPDATE students SET total_score = total_score + $1, coins = coins + $2 WHERE id = $3', [totalXp, coinsEarned, studentId]);

        res.json({ success: true, xpEarned: totalXp, coinsEarned });
    } catch (err) {
        console.error('Error submitting vocab battle:', err);
        res.status(500).json({ error: 'Failed to submit battle' });
    }
});
// -----------------------------

app.get('/api/unit-quizzes', async (req, res) => {
    try {
        const result = await query('SELECT * FROM unit_quizzes');
        res.json(result.rows);
    } catch (err: any) {
        console.error('Error fetching unit quizzes:', err);
        res.status(500).json({ error: 'Error fetching unit quizzes', details: err.message });
    }
});

app.get('/api/unit-quizzes/:id', async (req, res) => {
    try {
        const result = await query('SELECT * FROM unit_quizzes WHERE id = $1', [req.params.id]);
        if (result.rowCount === 0) return res.status(404).send('Unit Quiz not found');
        res.json(result.rows[0]);
    } catch (err: any) {
        console.error('Error fetching unit quiz:', err);
        res.status(500).json({ error: 'Error fetching unit quiz', details: err.message });
    }
});

app.post('/api/unit-quizzes', async (req, res) => {
    try {
        const { title, questions, level, unit, time_limit } = req.body;
        const id = uuidv4();
        await query(
            'INSERT INTO unit_quizzes (id, title, questions, level, unit, time_limit) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, title, JSON.stringify(questions), level, unit, time_limit || 30]
        );
        res.json({ id, title, questions, level, unit, time_limit: time_limit || 30 });
    } catch (err) {
        console.error('Error creating unit quiz:', err);
        res.status(500).json({ error: 'Error creating unit quiz' });
    }
});

app.put('/api/unit-quizzes/:id', async (req, res) => {
    try {
        const { title, questions, level, unit, time_limit } = req.body;
        const { id } = req.params;
        await query(
            'UPDATE unit_quizzes SET title = $1, questions = $2, level = $3, unit = $4, time_limit = $5 WHERE id = $6',
            [title, JSON.stringify(questions), level, unit, time_limit || 30, id]
        );
        res.json({ id, title, questions, level, unit, time_limit: time_limit || 30 });
    } catch (err) {
        console.error('Error updating unit quiz:', err);
        res.status(500).json({ error: 'Error updating unit quiz' });
    }
});

app.delete('/api/unit-quizzes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await query('DELETE FROM unit_quizzes WHERE id = $1', [id]);
        res.json({ success: true, id });
    } catch (err) {
        console.error('Error deleting unit quiz:', err);
        res.status(500).json({ error: 'Error deleting unit quiz' });
    }
});

// Teacher: Groups
app.post('/api/groups', async (req, res) => {
    try {
        const { name, teacherId, level } = req.body;
        const id = uuidv4();
        await query(
            'INSERT INTO groups (id, name, teacher_id, level) VALUES ($1, $2, $3, $4)',
            [id, name, teacherId, level || 'Beginner']
        );
        res.json({ id, name, teacherId, level });
    } catch (err) {
        res.status(500).json({ error: 'Error creating group' });
    }
});

app.put('/api/groups/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, level, teacherId } = req.body;

        if (teacherId) {
            await query(
                'UPDATE groups SET name = $1, level = $2, teacher_id = $3 WHERE id = $4',
                [name, level, teacherId, id]
            );
        } else {
            await query(
                'UPDATE groups SET name = $1, level = $2 WHERE id = $3',
                [name, level, id]
            );
        }
        res.json({ success: true, id, name, level, teacherId });
    } catch (err) {
        console.error('Error updating group:', err);
        res.status(500).json({ error: 'Error updating group' });
    }
});

app.get('/api/groups/:teacherId', async (req, res) => {
    try {
        const result = await query('SELECT * FROM groups WHERE teacher_id = $1', [req.params.teacherId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching groups' });
    }
});

app.get('/api/battles/:id/details', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Battle info
        const battleRes = await query(`
            SELECT b.*, g1.name as group_a_name, g2.name as group_b_name 
            FROM group_battles b
            JOIN groups g1 ON b.group_a_id = g1.id
            JOIN groups g2 ON b.group_b_id = g2.id
            WHERE b.id = $1
        `, [id]);

        if (battleRes.rowCount === 0) return res.status(404).json({ error: 'Battle not found' });
        const battle = battleRes.rows[0];

        // 2. Members Group A (All)
        const membersARes = await query(`
            SELECT name, weekly_battle_score, avatar_url, coins
            FROM students
            WHERE group_id = $1
            ORDER BY weekly_battle_score DESC
        `, [battle.group_a_id]);

        // 3. Members Group B (All)
        const membersBRes = await query(`
            SELECT name, weekly_battle_score, avatar_url, coins
            FROM students
            WHERE group_id = $1
            ORDER BY weekly_battle_score DESC
        `, [battle.group_b_id]);

        res.json({
            ...battle,
            membersA: membersARes.rows,
            membersB: membersBRes.rows,
            endsAt: new Date(new Date(battle.week_start).getTime() + 7 * 24 * 60 * 60 * 1000)
        });
    } catch (err) {
        console.error('Battle details error:', err);
        res.status(500).json({ error: 'Error fetching battle details' });
    }
});

app.get('/api/battles/current/:groupId', async (req, res) => {
    try {
        const battleRes = await query(`
            SELECT b.*, g1.name as group_a_name, g2.name as group_b_name 
            FROM group_battles b
            JOIN groups g1 ON b.group_a_id = g1.id
            JOIN groups g2 ON b.group_b_id = g2.id
            WHERE (group_a_id = $1 OR group_b_id = $1) AND status = 'active'
            ORDER BY created_at DESC LIMIT 1
        `, [req.params.groupId]);
        res.json(battleRes.rows[0] || null);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching battle' });
    }
});

app.delete('/api/groups/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Check if group exists
        const check = await query('SELECT * FROM groups WHERE id = $1', [id]);
        if (check.rowCount === 0) {
            return res.status(404).json({ error: 'Group not found' });
        }

        // Delete group (Cascade should handle students/results if configured, otherwise we might need manual cleanup)
        // Assuming schema handles cascade or we want to hard delete
        await query('DELETE FROM groups WHERE id = $1', [id]);

        res.json({ success: true, id });
    } catch (err) {
        console.error('Error deleting group:', err);
        res.status(500).json({ error: 'Error deleting group' });
    }
});

// Teacher: Students
// Removed duplicate /api/admin/groups route


app.post('/api/students', async (req, res) => {
    try {
        const { name, groupId, phone, parentName, parentPhone } = req.body;
        const id = await generateStudentId();
        const parentId = await generateParentId();
        await query(
            'INSERT INTO students (id, name, group_id, phone, parent_name, parent_phone, parent_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [id, name, groupId, phone, parentName, parentPhone, parentId]
        );

        // Notify Teacher
        try {
            const teacherRes = await query(`
                SELECT t.telegram_chat_id, g.name as group_name 
                FROM teachers t 
                JOIN groups g ON t.id = g.teacher_id 
                WHERE g.id = $1
            `, [groupId]);
            if (teacherRes.rows[0]?.telegram_chat_id) {
                await notifyTeacher(teacherRes.rows[0].telegram_chat_id, `🆕 <b>Yangi o'quvchi qo'shildi!</b>\n👤 Ism: ${name}\n🏫 Guruh: ${teacherRes.rows[0].group_name}\n📞 Tel: ${phone}`);
            }
        } catch (e) {
            console.error('Error notifying teacher about new student:', e);
        }

        res.json({ id, parentId, name, groupId, phone, parentName, parentPhone, status: 'Offline' });
    } catch (err) {
        res.status(500).json({ error: 'Error creating student' });
    }
});

app.get('/api/students/search', async (req, res) => {
    try {
        const { q, teacherId, role } = req.query;
        console.log(`[Search] Q: "${q}", teacherId: "${teacherId}", role: "${role}"`);

        if (!q) return res.json([]);

        // Base query
        let queryStr = `
            SELECT s.id, s.name, s.group_id, g.name as group_name, g.teacher_id
            FROM students s
            JOIN groups g ON s.group_id = g.id
            WHERE (s.name ILIKE $1 OR s.id ILIKE $1)
        `;
        const params: any[] = [`%${q}%`];

        // Mandatory filtering for teachers
        if (role === 'teacher' || (teacherId && teacherId !== ADMIN_ID)) {
            if (!teacherId || teacherId === 'null' || teacherId === 'undefined') {
                console.log(`[Search] Blocking search: Role is teacher but teacherId is missing/invalid.`);
                return res.json([]); // Return nothing if we can't filter correctly for a teacher
            }
            queryStr += ` AND g.teacher_id = $2::uuid`;
            params.push(teacherId);
            console.log(`[Search] Enforced filter by teacherId: ${teacherId}`);
        } else {
            console.log(`[Search] Performing global search (Admin or no filter)`);
        }

        queryStr += ` LIMIT 20`;

        const result = await query(queryStr, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({ error: 'Error searching students' });
    }
});

app.get('/api/students/:groupId', async (req, res) => {
    try {
        const result = await query('SELECT * FROM students WHERE group_id = $1', [req.params.groupId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching students' });
    }
});

// Student Actions
app.delete('/api/students/:id', async (req, res) => {
    try {
        await query('DELETE FROM students WHERE id = $1', [req.params.id]);
        await query('DELETE FROM student_telegram_subscriptions WHERE student_id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting student:', err);
        res.status(500).json({ error: 'Error deleting student' });
    }
});

app.put('/api/students/:id/move', async (req, res) => {
    try {
        const { newGroupId } = req.body;
        console.log(`Trying to move student ${req.params.id} to group ${newGroupId}`);
        const result = await query('UPDATE students SET group_id = $1 WHERE id = $2', [newGroupId, req.params.id]);
        if (result.rowCount === 0) {
            console.log(`Student ${req.params.id} not found or not updated`);
            return res.status(404).json({ error: 'Student not found or not updated' });
        }
        console.log(`Successfully moved student ${req.params.id} to group ${newGroupId}`);
        res.json({ success: true });
    } catch (err) {
        console.error('Error moving student:', err);
        res.status(500).json({ error: 'Error moving student' });
    }
});

// Student: Check ID & Login
app.post('/api/student/check-id', async (req, res) => {
    try {
        const { id } = req.body;
        const result = await query('SELECT id, name, password, group_id FROM students WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'O\'quvchi topilmadi' });
        }

        const student = result.rows[0];
        // Returns true if password is set, false otherwise
        res.json({
            exists: true,
            hasPassword: !!student.password,
            name: student.name
        });
    } catch (err) {
        res.status(500).json({ error: 'Server xatosi' });
    }
});

app.post('/api/student/login', async (req, res) => {
    try {
        const { id, password } = req.body;

        const result = await query('SELECT s.*, g.name as group_name, t.name as teacher_name FROM students s JOIN groups g ON s.group_id = g.id LEFT JOIN teachers t ON g.teacher_id = t.id WHERE s.id = $1', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'O\'quvchi topilmadi' });
        }

        const student = result.rows[0];

        if (student.password) {
            // Verify password
            const match = await bcrypt.compare(password, student.password);
            if (!match && student.password !== password) {
                return res.status(401).json({ error: 'Parol noto\'g\'ri' });
            }
        } else {
            // First time login: Set password
            const hashedPassword = await bcrypt.hash(password, 10);
            await query('UPDATE students SET password = $1 WHERE id = $2', [hashedPassword, id]);
        }

        res.json({
            token: 'mock-jwt-token', // In real app use JWT
            user: {
                id: student.id,
                name: student.name,
                groupId: student.group_id,
                groupName: student.group_name,
                teacherName: student.teacher_name,
                role: 'student'
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server xatosi' });
    }
});


app.post('/api/student/:id/usage', async (req, res) => {
    try {
        const { id } = req.params;
        const { totalScreenTimeMs, topApps } = req.body;

        if (totalScreenTimeMs == null) return res.status(400).json({ error: 'Missing totalScreenTimeMs' });

        // Get student details First
        const studentRes = await query('SELECT name FROM students WHERE id = $1', [id]);
        if (studentRes.rowCount === 0) return res.status(404).json({ error: 'Student not found' });

        const formatTime = (ms: number) => {
            const minutes = Math.floor(ms / 60000) % 60;
            const hours = Math.floor(ms / 3600000);
            return `${hours} soat ${minutes} minut`;
        };

        const student = studentRes.rows[0];
        let report = `📱 <b>Farzandingiz (${student.name}) bugungi telefon ko'rsatkichi:</b>\n\n`;
        report += `⏱ <b>Jami Vaqt:</b> ${formatTime(totalScreenTimeMs)}\n\n`;

        if (topApps && Array.isArray(topApps) && topApps.length > 0) {
            report += `🔥 <b>Eng ko'p ishlatilgan dasturlar:</b>\n`;
            topApps.forEach((app, index) => {
                report += `${index + 1}. ${app.name} — ${formatTime(app.timeMs)}\n`;
            });
        }

        // Relay silently format to Telegram
        await notifyStudentSubscribers(id, report);

        res.json({ success: true, message: 'Usage stats relayed to Telegram' });

    } catch (err) {
        console.error('Usage stats relay error:', err);
        res.status(500).json({ error: 'Error processing usage stats' });
    }
});

app.get('/api/student/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;

        // Basic Student Info (Coins, Streaks, Battle Stats) - use LEFT JOIN so missing group doesn't crash
        const studentRes = await query(`
            SELECT
            s.coins,
                s.streak_count,
                COALESCE(s.is_hero, false) as is_hero,
                COALESCE(s.weekly_battle_score, 0) as weekly_battle_score,
                s.group_id,
                COALESCE(g.has_trophy, false) as has_trophy 
            FROM students s 
            LEFT JOIN groups g ON s.group_id = g.id 
            WHERE s.id = $1
                `, [id]);
        if (studentRes.rowCount === 0) return res.status(404).json({ error: 'Student not found' });
        const student = studentRes.rows[0];

        // Games Played & Total Score (from group games)
        const gamesRes = await query(`
            SELECT COUNT(*) as games_count
            FROM game_results, jsonb_array_elements(player_results) as player
            WHERE player ->> 'id' = $1
                `, [id]);

        const scoreRes = await query(`
            SELECT SUM((player ->> 'score'):: int) as total_score
            FROM game_results, jsonb_array_elements(player_results) as player
            WHERE player ->> 'id' = $1
                `, [id]);

        // Global Rank based on coins
        const rankRes = await query(`
            SELECT COUNT(*) + 1 as rank
            FROM students
            WHERE coins > (SELECT coins FROM students WHERE id = $1)
    `, [id]);

        // Check avatar unlock purchase
        const unlockRes = await query(`
            SELECT 1 FROM student_purchases 
            WHERE student_id = $1 AND item_id = 'avatar_unlock'
    `, [id]);

        res.json({
            coins: student.coins || 0,
            streakCount: student.streak_count || 0,
            isHero: student.is_hero || false,
            hasTrophy: student.has_trophy || false,
            weeklyBattleScore: student.weekly_battle_score || 0,
            groupId: student.group_id,
            avatarUrl: student.avatar_url || null,
            hasAvatarUnlock: (unlockRes.rowCount || 0) > 0,
            gamesPlayed: parseInt(gamesRes.rows[0].games_count) || 0,
            totalScore: parseInt(scoreRes.rows[0].total_score) || 0,
            rank: parseInt(rankRes.rows[0].rank) || 1
        });
    } catch (err) {
        console.error('Stats error:', err);
        res.status(500).json({ error: 'Error fetching stats' });
    }
});

app.get('/api/leaderboard', async (req, res) => {
    try {
        const { type = 'coins', limit = 50, view = 'global', groupId } = req.query;
        let queryStr = `
            SELECT s.id, s.name, s.coins, s.streak_count, s.avatar_url, g.name as group_name, g.level as group_level
            FROM students s
            LEFT JOIN groups g ON s.group_id = g.id
    `;
        const params: any[] = [];

        if (view === 'group' && groupId && groupId !== 'undefined' && groupId !== 'null') {
            queryStr += ` WHERE s.group_id = $1`;
            params.push(groupId);
        } else if (view === 'global' && groupId && groupId !== 'undefined' && groupId !== 'null') {
            // Filter by students in groups that have the same level as the requester's group
            queryStr += ` WHERE g.level = (SELECT level FROM groups WHERE id = $1)`;
            params.push(groupId);
        }

        if (type === 'streaks') {
            queryStr += ` ORDER BY s.streak_count DESC, s.coins DESC`;
        } else {
            queryStr += ` ORDER BY s.coins DESC, s.streak_count DESC`;
        }

        queryStr += ` LIMIT $${params.length + 1} `;
        params.push(parseInt(limit as string));

        const result = await query(queryStr, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Leaderboard error:', err);
        res.status(500).json({ error: 'Error fetching leaderboard' });
    }
});

app.get('/api/student/:id/history', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query(`
SELECT
quiz_title,
    created_at,
    player ->> 'score' as score,
    total_questions,
    (player ->> 'score'):: int * 100 / NULLIF(total_questions * 100, 0) as percentage,
        player -> 'answers' as answers
            FROM game_results, jsonb_array_elements(player_results) as player
            WHERE player ->> 'id' = $1
            ORDER BY created_at DESC
            LIMIT 50
    `, [id]);

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching history' });
    }
});

// Shop Items (Database logic implemented)

app.get('/api/shop/items', async (req, res) => {
    try {
        const result = await query('SELECT * FROM shop_items WHERE is_active = TRUE ORDER BY price ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching shop items:', err);
        res.status(500).json({ error: 'Do\'kon yuklanmadi' });
    }
});

app.post('/api/student/purchase', async (req, res) => {
    try {
        const { studentId, itemId } = req.body;

        // Fetch item from DB
        const itemRes = await query('SELECT * FROM shop_items WHERE id = $1 AND is_active = TRUE', [itemId]);
        if (itemRes.rowCount === 0) return res.status(404).json({ error: 'Item not found' });
        const item = itemRes.rows[0];

        const studentRes = await query('SELECT coins FROM students WHERE id = $1', [studentId]);
        if (studentRes.rowCount === 0) return res.status(404).json({ error: 'Student not found' });

        const student = studentRes.rows[0];
        if (student.coins < item.price) {
            return res.status(400).json({ error: 'Mablag\' yetarli emas' });
        }

        // Deduct coins and log purchase
        const newCoinsCount = student.coins - item.price;
        await query('UPDATE students SET coins = $1 WHERE id = $2', [newCoinsCount, studentId]);
        await query(
            'INSERT INTO student_purchases (id, student_id, item_type, item_id) VALUES ($1, $2, $3, $4)',
            [uuidv4(), studentId, item.type, itemId]
        );

        // If it's an avatar, update student's avatar_url
        if (item.type === 'avatar' && item.url) {
            await query('UPDATE students SET avatar_url = $1 WHERE id = $2', [item.url, studentId]);
        }

        res.json({ success: true, newCoins: newCoinsCount });
    } catch (err) {
        console.error('Purchase error:', err);
        res.status(500).json({ error: 'Xarid amalga oshmadi' });
    }
});

// Manager: Shop Items Management
app.post('/api/manager/shop/items', async (req, res) => {
    try {
        const { name, type, price, url, color } = req.body;
        const id = uuidv4();
        await query(
            'INSERT INTO shop_items (id, name, type, price, url, color) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, name, type, price, url || null, color || null]
        );
        res.json({ id, name, type, price, url, color, is_active: true });
    } catch (err) {
        console.error('Error creating shop item:', err);
        res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
});

app.put('/api/manager/shop/items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, price, url, color, is_active } = req.body;
        await query(
            'UPDATE shop_items SET name = $1, type = $2, price = $3, url = $4, color = $5, is_active = $6 WHERE id = $7',
            [name, type, price, url || null, color || null, is_active !== undefined ? is_active : true, id]
        );
        res.json({ id, name, type, price, url, color, is_active });
    } catch (err) {
        console.error('Error updating shop item:', err);
        res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
});

app.delete('/api/manager/shop/items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await query('DELETE FROM shop_items WHERE id = $1', [id]);
        res.json({ success: true, id });
    } catch (err) {
        console.error('Error deleting shop item:', err);
        res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
});

// Manager: System Settings Management
app.get('/api/manager/settings', async (req, res) => {
    try {
        const result = await query('SELECT key, value, description, updated_at FROM system_settings ORDER BY key');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching settings:', err);
        res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
});

app.put('/api/manager/settings/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;
        await query(
            'UPDATE system_settings SET value = $1, updated_at = NOW() WHERE key = $2',
            [JSON.stringify(value), key]
        );
        res.json({ success: true, key, value });
    } catch (err) {
        console.error('Error updating setting:', err);
        res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
});

app.put('/api/student/:id/avatar', async (req, res) => {
    try {
        const { id } = req.params;
        const { avatar_url } = req.body;

        if (!avatar_url) {
            return res.status(400).json({ error: 'Rasm yuborilmadi' });
        }

        // Verify the student actually owns the avatar_unlock item
        const checkUnlock = await query(
            "SELECT 1 FROM student_purchases WHERE student_id = $1 AND item_id = 'avatar_unlock'",
            [id]
        );

        if (checkUnlock.rowCount === 0) {
            return res.status(403).json({ error: "Siz avval 'Shaxsiy Avatar Yuklash' huquqini sotib olishingiz kerak" });
        }

        await query('UPDATE students SET avatar_url = $1 WHERE id = $2', [avatar_url, id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Avatar update error:', err);
        res.status(500).json({ error: 'Rasm saqlanmadi' });
    }
});

// Teacher: Groups
app.get('/api/teachers/:teacherId/groups', async (req, res) => {
    try {
        const result = await query('SELECT * FROM groups WHERE teacher_id = $1', [req.params.teacherId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching groups' });
    }
});

// Get Single Group
app.get('/api/groups/:groupId', async (req, res) => {
    try {
        const result = await query('SELECT * FROM groups WHERE id = $1', [req.params.groupId]);
        if (!result.rowCount || result.rowCount === 0) return res.status(404).json({ error: 'Group not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching group:', err);
        res.status(500).json({ error: 'Error fetching group' });
    }
});

// Teacher: Group Results
app.get('/api/groups/:groupId/results', async (req, res) => {
    try {
        const result = await query(
            'SELECT * FROM game_results WHERE group_id = $1 ORDER BY created_at DESC',
            [req.params.groupId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching group results:', err);
        res.status(500).json({ error: 'Error fetching group results' });
    }
});

// Update Student Contact Info and Log History
app.post('/api/students/:id/contact', async (req, res) => {
    try {
        const { relative } = req.body; // 'Otasi', 'Onasi', etc.
        const logId = uuidv4();

        // Update student record for quick access
        await query(
            'UPDATE students SET last_contacted_relative = $1, last_contacted_at = NOW() WHERE id = $2',
            [relative, req.params.id]
        );

        // Insert into contact logs
        await query(
            'INSERT INTO contact_logs (id, student_id, relative, contacted_at) VALUES ($1, $2, $3, NOW())',
            [logId, req.params.id, relative]
        );

        res.json({ success: true, relative, contactedAt: new Date() });
    } catch (err) {
        console.error('Error updating student contact:', err);
        res.status(500).json({ error: 'Error updating contact info' });
    }
});

// Get Student Contact History
app.get('/api/students/:id/contact-logs', async (req, res) => {
    try {
        const result = await query(
            'SELECT * FROM contact_logs WHERE student_id = $1 ORDER BY contacted_at DESC',
            [req.params.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching contact logs:', err);
        res.status(500).json({ error: 'Error fetching contact logs' });
    }
});

// Get Group Contact Logs (for PDF export)
app.get('/api/groups/:groupId/contact-logs', async (req, res) => {
    try {
        const { groupId } = req.params;
        const filter = req.query.filter as string; // 'today' | 'week' | 'all'

        let sinceDate: Date;
        const now = new Date();
        if (filter === 'today') {
            sinceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        } else if (filter === 'week') {
            sinceDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else {
            sinceDate = new Date(0); // all time
        }

        const result = await query(`
SELECT
cl.id,
    cl.relative,
    cl.contacted_at,
    s.name AS student_name,
        s.parent_name,
        s.parent_phone,
        g.name AS group_name
            FROM contact_logs cl
            JOIN students s ON cl.student_id = s.id
            JOIN groups g ON s.group_id = g.id
            WHERE s.group_id = $1
              AND cl.contacted_at >= $2
            ORDER BY cl.contacted_at DESC
        `, [groupId, sinceDate]);

        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching group contact logs:', err);
        res.status(500).json({ error: 'Error fetching group contact logs' });
    }
});

// General Quizzes
app.post('/api/quizzes', async (req, res) => {
    try {
        const { title, questions } = req.body;
        const id = uuidv4();
        await query(
            'INSERT INTO quizzes (id, title, questions) VALUES ($1, $2, $3)',
            [id, title, JSON.stringify(questions)]
        );
        res.json({ id, title, questions });
    } catch (err) {
        res.status(500).json({ error: 'Error creating quiz' });
    }
});

app.get('/api/quizzes', async (req, res) => {
    try {
        const result = await query('SELECT * FROM quizzes');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching quizzes' });
    }
});

app.get('/api/quizzes/:id', async (req, res) => {
    try {
        const result = await query('SELECT * FROM quizzes WHERE id = $1', [req.params.id]);
        if (result.rowCount === 0) return res.status(404).send('Quiz not found');
        res.json(result.rows[0]);
    } catch (err: any) {
        console.error('Error fetching quiz:', err);
        res.status(500).json({ error: 'Error fetching quiz', details: err.message });
    }
});

// Stats Endpoints
app.get('/api/admin/stats', async (req, res) => {
    try {
        const teachersRes = await query('SELECT COUNT(*) FROM teachers');
        const groupsRes = await query('SELECT COUNT(*) FROM groups');
        const studentsRes = await query('SELECT COUNT(*) FROM students');
        const quizzesRes = await query('SELECT COUNT(*) FROM unit_quizzes');

        res.json({
            teachers: parseInt(teachersRes.rows[0].count),
            groups: parseInt(groupsRes.rows[0].count),
            students: parseInt(studentsRes.rows[0].count),
            quizzes: parseInt(quizzesRes.rows[0].count)
        });
    } catch (err) {
        console.error('Error fetching admin stats:', err);
        res.status(500).json({ error: 'Error fetching stats' });
    }
});

app.get('/api/teacher/:id/stats', async (req, res) => {
    try {
        const groupsRes = await query('SELECT COUNT(*) FROM groups WHERE teacher_id = $1', [req.params.id]);
        const studentsRes = await query(
            'SELECT COUNT(*) FROM students s JOIN groups g ON s.group_id = g.id WHERE g.teacher_id = $1',
            [req.params.id]
        );
        const quizzesRes = await query('SELECT COUNT(*) FROM unit_quizzes'); // Teachers see all unit quizzes currently

        res.json({
            groups: parseInt(groupsRes.rows[0].count),
            students: parseInt(studentsRes.rows[0].count),
            quizzes: parseInt(quizzesRes.rows[0].count)
        });
    } catch (err) {
        console.error('Error fetching teacher stats:', err);
        res.status(500).json({ error: 'Error fetching stats' });
    }
});

// normalizeAnswer moved to utils.ts

async function awardRewards(studentId: string, score: number) {
    try {
        if (studentId.length !== 7) return;

        // Double XP Weekend logic (Saturday = 6, Sunday = 0)
        const now = new Date();
        const day = now.getDay();
        const isDoubleXP = (day === 0 || day === 6);
        const actualScore = isDoubleXP ? score * 2 : score;

        const coinsToAward = Math.floor(actualScore);
        const studentRes = await query('SELECT last_activity_at, streak_count, group_id FROM students WHERE id = $1', [studentId]);
        if (studentRes.rowCount === 0) return;
        const student = studentRes.rows[0];

        let newStreak = student.streak_count || 0;
        if (student.last_activity_at) {
            const lastDate = new Date(student.last_activity_at);
            const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
            if (diffDays === 1) {
                newStreak += 1;
                // Notify streak milestone
                if ([3, 7, 10, 15, 30, 50, 100].includes(newStreak)) {
                    await notifyStudentSubscribers(studentId, `🔥 <b>Dahshatli natija! < /b>\nSiz <b>${newStreak} kun</b > ketma - ket dars qildingiz.To'xtab qolmang! 🚀`);
                }
            } else if (diffDays > 1) {
                newStreak = 1;
            }
        } else {
            newStreak = 1;
        }

        // Level Up Logic (Example: every 500 XP is high activity)
        if (actualScore >= 500) {
            await notifyStudentSubscribers(studentId, `🌟 <b>Barakalla!</b>\nSiz bugun juda faolsiz! +${actualScore} XP to'pladingiz. 💰`);
        }

        // Update Student
        await query(
            'UPDATE students SET coins = coins + $1, streak_count = $2, last_activity_at = $3, weekly_battle_score = weekly_battle_score + $4 WHERE id = $5',
            [coinsToAward, newStreak, now, actualScore, studentId]
        );

        // Update Group Battle Score
        const battleRes = await query(`
            SELECT id, group_a_id, group_b_id 
            FROM group_battles 
            WHERE (group_a_id = $1 OR group_b_id = $1) AND status = 'active'
            ORDER BY created_at DESC LIMIT 1
        `, [student.group_id]);

        if (battleRes.rowCount && battleRes.rowCount > 0) {
            const battle = battleRes.rows[0];
            if (battle.group_a_id === student.group_id) {
                await query('UPDATE group_battles SET score_a = score_a + $1 WHERE id = $2', [actualScore, battle.id]);
            } else {
                await query('UPDATE group_battles SET score_b = score_b + $1 WHERE id = $2', [actualScore, battle.id]);
            }
        }

        console.log(`[Rewards] Awarded ${coinsToAward} coins to student ${studentId}. New streak: ${newStreak} (Double XP: ${isDoubleXP})`);
    } catch (err) {
        console.error('[Rewards] Error awarding rewards:', err);
    }
}

async function bulkAwardRewards(players: { id: string, score: number }[]) {
    try {
        const validPlayers = players.filter(p => p.id && p.id.length === 7);
        if (validPlayers.length === 0) return;

        const now = new Date();
        const day = now.getDay();
        const isDoubleXP = (day === 0 || day === 6);

        const ids = validPlayers.map(p => p.id);
        const studentRes = await query('SELECT id, last_activity_at, streak_count, group_id FROM students WHERE id = ANY($1)', [ids]);
        const studentMap = new Map(studentRes.rows.map(r => [r.id, r]));

        const updates = [];
        const battleUpdates = new Map<string, number>();

        for (const p of validPlayers) {
            const student = studentMap.get(p.id);
            if (!student) continue;

            const actualScore = isDoubleXP ? p.score * 2 : p.score;
            const coinsToAward = Math.floor(actualScore);

            let newStreak = student.streak_count || 0;
            if (student.last_activity_at) {
                const lastDate = new Date(student.last_activity_at);
                const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
                if (diffDays === 1) {
                    newStreak += 1;
                    if ([3, 7, 10, 15, 30, 50, 100].includes(newStreak)) {
                        notifyStudentSubscribers(p.id, `🔥 <b>Dahshatli natija!</b>\nSiz <b>${newStreak} kun</b> ketma-ket dars qildingiz. To'xtab qolmang! 🚀`);
                    }
                } else if (diffDays > 1) {
                    newStreak = 1;
                }
            } else {
                newStreak = 1;
            }

            if (actualScore >= 500) {
                notifyStudentSubscribers(p.id, `🌟 <b>Barakalla!</b>\nSiz bugun juda faolsiz! +${actualScore} XP to'pladingiz. 💰`);
            }

            // Push promises representing batched concurrent queries
            updates.push(query(
                'UPDATE students SET coins = coins + $1, streak_count = $2, last_activity_at = $3, weekly_battle_score = weekly_battle_score + $4 WHERE id = $5',
                [coinsToAward, newStreak, now, actualScore, p.id]
            ));

            battleUpdates.set(student.group_id, (battleUpdates.get(student.group_id) || 0) + actualScore);
        }

        // Apply concurrency (DB Pool will cap this around 50 max active queries at a time, efficiently queuing the rest)
        await Promise.all(updates);

        if (battleUpdates.size > 0) {
            const groupIds = Array.from(battleUpdates.keys());
            const battleRes = await query(`
                SELECT id, group_a_id, group_b_id 
                FROM group_battles 
                WHERE (group_a_id = ANY($1) OR group_b_id = ANY($1)) AND status = 'active'
            `, [groupIds]);

            for (const battle of battleRes.rows) {
                const scoreA = battleUpdates.get(battle.group_a_id) || 0;
                const scoreB = battleUpdates.get(battle.group_b_id) || 0;
                if (scoreA > 0) await query('UPDATE group_battles SET score_a = score_a + $1 WHERE id = $2', [scoreA, battle.id]);
                if (scoreB > 0) await query('UPDATE group_battles SET score_b = score_b + $1 WHERE id = $2', [scoreB, battle.id]);
            }
        }
        console.log(`[Bulk Rewards] Successfully awarded ${validPlayers.length} players simultaneously.`);
    } catch (err) {
        console.error('[Bulk Rewards] Error:', err);
    }
}

function scrubPlayers(game: any) {
    if (game.isUnitQuiz) {
        return game.players.map((p: any) => ({
            id: p.id,
            name: p.name,
            answeredCount: Object.entries(p.answers || {}).filter(([qIdx, a]) => {
                const isValidAnswer = a !== "" && a !== null && a !== undefined;
                const isNotInfoSlide = game.quiz?.questions?.[Number(qIdx)]?.type !== 'info-slide';
                return isValidAnswer && isNotInfoSlide;
            }).length,
            status: p.status,
            isFinished: p.isFinished,
            isCheater: p.isCheater
        }));
    }
    return game.players;
}

// Throttling mechanism for unit quiz updates
const updateThrottles: Record<string, NodeJS.Timeout | null> = {};
const pendingPlayerUpdates: Record<string, Set<string>> = {};

function broadcastPlayerUpdate(pin: string, playerId?: string) {
    const game = games[pin];
    if (!game || !game.hostId || game.hostId === 'system') return;

    if (game.isUnitQuiz) {
        if (!pendingPlayerUpdates[pin]) {
            pendingPlayerUpdates[pin] = new Set();
        }

        if (playerId) {
            pendingPlayerUpdates[pin].add(playerId);
        } else {
            pendingPlayerUpdates[pin].add('ALL');
        }

        // If already scheduled, do nothing
        if (updateThrottles[pin]) return;

        // Schedule an update in 2 seconds
        updateThrottles[pin] = setTimeout(() => {
            const currentGame = games[pin];
            if (currentGame) {
                const updates = pendingPlayerUpdates[pin];
                const cleanPlayers = scrubPlayers(currentGame);

                if (updates.has('ALL')) {
                    io.to(currentGame.hostId).emit('player-update', cleanPlayers);
                } else {
                    const changedPlayers = cleanPlayers.filter((p: any) => updates.has(p.id));
                    if (changedPlayers.length > 0) {
                        io.to(currentGame.hostId).emit('player-update-delta', changedPlayers);
                    }
                }
            }
            if (pendingPlayerUpdates[pin]) {
                pendingPlayerUpdates[pin].clear();
            }
            updateThrottles[pin] = null;
        }, 2000);
    } else {
        io.to(game.hostId).emit('player-update', scrubPlayers(game));
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
            const pin = generatePin();
            games[pin] = {
                pin,
                quiz,
                hostId: socket.id,
                players: [],
                status: 'LOBBY',
                currentQuestionIndex: -1
            };
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
            const result = await query('SELECT * FROM unit_quizzes WHERE id = $1', [quizId]);
            if (result.rowCount === 0) {
                socket.emit('error', 'Unit Quiz not found');
                return;
            }
            const quiz = result.rows[0];
            const pin = generatePin();
            games[pin] = {
                pin,
                quiz,
                hostId: socket.id,
                players: [],
                status: 'LOBBY',
                currentQuestionIndex: -1,
                isUnitQuiz: true,
                groupId
            };
            socket.join(pin);
            socket.emit('game-created', pin);
            console.log(`Unit Game created: ${pin} for group ${groupId}`);
        } catch (err) {
            socket.emit('error', 'Database error');
        }
    });

    // Helper: Mark player offline on disconnect
    socket.on('disconnect', () => {
        const pin = (socket as any).pin;
        if (pin && games[pin]) {
            const game = games[pin];
            const player = game.players.find(p => p.id === socket.id || p.id === (socket as any).studentId);
            if (player) {
                player.status = 'Offline';
                broadcastPlayerUpdate(pin, player.id);
            }
        }
    });

    // Player: Join Game (Normal)
    socket.on('player-join', ({ pin, name }: { pin: string, name: string }) => {
        const game = games[pin];
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
        socket.join(pin);
        (socket as any).pin = pin;

        io.to(game.hostId).emit('player-update', game.players);
        socket.emit('joined', { name, pin });
    });

    // Student: Join Unit Game (via 7-digit ID)
    socket.on('student-join', async ({ pin, studentId }: { pin: string, studentId: string }) => {
        try {
            const game = games[pin];
            if (!game) {
                socket.emit('error', 'Game not found');
                return;
            }

            const result = await query('SELECT * FROM students WHERE id = $1', [studentId]);
            if (result.rowCount === 0) {
                socket.emit('error', 'Student ID not found');
                return;
            }
            const student = result.rows[0];

            if (game.isUnitQuiz && !game.isDuel && game.groupId && String(student.group_id).toLowerCase() !== String(game.groupId).toLowerCase()) {
                socket.emit('error', 'Bu test sizning guruhingiz uchun emas');
                return;
            }

            (socket as any).studentId = studentId;
            (socket as any).pin = pin;
            studentSockets[studentId] = socket.id;

            let player = game.players.find(p => p.id === studentId);
            if (player) {
                if (player.status !== 'Cheating') {
                    player.status = 'Online';
                }
            } else {
                player = {
                    id: studentId,
                    name: student.name,
                    score: 0,
                    answers: {},
                    status: 'Online'
                };
                game.players.push(player);
            }

            socket.join(pin);
            socket.emit('joined', { name: student.name, pin });

            if (game.hostId && game.hostId !== 'system') {
                broadcastPlayerUpdate(pin);
            }

            if (game.status === 'ACTIVE') {
                if (game.isUnitQuiz) {
                    const questionsForStudents = (game.quiz.questions as any[]).map((q, idx) => ({
                        info: q.info,
                        text: q.text,
                        options: q.options,
                        type: q.type,
                        acceptedAnswers: q.type === 'matching' ? q.acceptedAnswers : undefined,
                        questionIndex: idx + 1,
                        totalQuestions: game.quiz.questions.length
                    }));
                    socket.emit('unit-game-started', { questions: questionsForStudents, endTime: game.endTime, title: game.quiz.title });
                } else {
                    socket.emit('game-started', { endTime: game.endTime, title: game.quiz.title });
                }
            }
        } catch (err) {
            socket.emit('error', 'Database error');
        }
    });

    // Student: Status Update (Anti-Cheat)
    socket.on('student-status-update', ({ pin, studentId, status }: { pin: string, studentId: string, status: 'Online' | 'Offline' | 'Cheating' }) => {
        const game = games[pin];
        if (!game) return;

        const player = game.players.find(p => p.id === studentId || p.id === socket.id);
        if (player) {
            if (status === 'Cheating') {
                player.isCheater = true;
                console.log(`[Cheat Alert] Student ${studentId || player.name} flagged as cheater in game ${pin}`);
            }
            if (player.status === 'Cheating' && status === 'Online') return;
            player.status = status;
            broadcastPlayerUpdate(pin, player.id);
        }
    });

    // Host: Start Game
    socket.on('host-start-game', ({ pin, timeLimit }: { pin: string, timeLimit: number }) => {
        const game = games[pin];
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

        io.to(pin).emit('game-started', { endTime, title: game.quiz.title });

        if (game.isUnitQuiz) {
            const questionsForStudents = game.quiz.questions.map((q, idx) => ({
                info: q.info,
                text: q.text,
                options: q.options,
                type: q.type,
                acceptedAnswers: q.type === 'matching' ? q.acceptedAnswers : undefined,
                questionIndex: idx + 1,
                totalQuestions: game.quiz.questions.length
            }));
            io.to(pin).emit('unit-game-started', { questions: questionsForStudents, endTime, title: game.quiz.title });
        } else {
            sendQuestion(pin);
        }
    });

    // Host: Next Question
    socket.on('host-next-question', (pin: string) => {
        const game = games[pin];
        if (!game || game.hostId !== socket.id) return;

        game.currentQuestionIndex++;
        if (game.currentQuestionIndex >= game.quiz.questions.length) {
            finishGame(pin);
        } else {
            sendQuestion(pin);
        }
    });

    // Host: End Game Early
    socket.on('host-end-game', (pin: string) => {
        const game = games[pin];
        if (!game || game.hostId !== socket.id) return;
        finishGame(pin);
    });

    // Host: Get Game Status
    socket.on('host-get-status', (pin: string) => {
        const game = games[pin];
        if (!game) return;

        game.hostId = socket.id;
        socket.join(pin);

        if (game.status === 'ACTIVE') {
            const endTime = game.endTime;
            socket.emit('game-started', { endTime, title: game.quiz.title });

            if (game.isUnitQuiz) {
                const questionsForStudents = (game.quiz.questions as any[]).map((q, idx) => ({
                    info: q.info,
                    text: q.text,
                    options: q.options,
                    type: q.type,
                    acceptedAnswers: q.type === 'matching' ? q.acceptedAnswers : undefined,
                    questionIndex: idx + 1,
                    totalQuestions: game.quiz.questions.length
                }));
                socket.emit('unit-game-started', { questions: questionsForStudents, endTime, title: game.quiz.title });
            } else if (game.currentQuestionIndex >= 0) {
                const q = game.quiz.questions[game.currentQuestionIndex];
                socket.emit('question-new', {
                    ...q,
                    questionIndex: game.currentQuestionIndex + 1,
                    totalQuestions: game.quiz.questions.length
                });
            }
            broadcastPlayerUpdate(pin);
        }
    });

    // Player: Get Game Status
    socket.on('player-get-status', ({ pin, studentId }: { pin: string, studentId?: string }) => {
        const game = games[pin];
        if (!game) return;

        socket.join(pin);
        (socket as any).pin = pin;

        if (studentId) {
            (socket as any).studentId = studentId;
            const player = game.players.find(p => p.id === studentId);
            if (player) {
                if (player.status !== 'Cheating') {
                    player.status = 'Online';
                }
                broadcastPlayerUpdate(game.pin, player.id);
            }
        }

        if (game.status === 'ACTIVE') {
            const endTime = game.endTime;
            if (game.isUnitQuiz) {
                const questionsForStudents = (game.quiz.questions as any[]).map((q, idx) => ({
                    info: q.info,
                    text: q.text,
                    options: q.options,
                    type: q.type,
                    acceptedAnswers: q.type === 'matching' ? q.acceptedAnswers : undefined,
                    questionIndex: idx + 1,
                    totalQuestions: game.quiz.questions.length
                }));
                socket.emit('unit-game-started', { questions: questionsForStudents, endTime, title: game.quiz.title });
            } else if (game.currentQuestionIndex >= 0) {
                const q = game.quiz.questions[game.currentQuestionIndex];
                socket.emit('question-start', {
                    ...q,
                    questionIndex: game.currentQuestionIndex + 1,
                    totalQuestions: game.quiz.questions.length
                });
            }
        }
    });

    // Student: Finalize Unit Quiz
    socket.on('unit-player-finish', ({ pin }: { pin: string }) => {
        const game = games[pin];
        if (!game || !game.isUnitQuiz || game.status !== 'ACTIVE') return;

        const playerId = (socket as any).studentId || socket.id;
        const player = game.players.find(p => p.id === playerId);
        if (!player) return;

        (player as any).isFinished = true;

        const correctAnswers = (game.quiz.questions as any[]).map(q => ({
            type: q.type,
            correctIndex: q.correctIndex,
            acceptedAnswers: q.acceptedAnswers
        }));

        broadcastPlayerUpdate(pin, player.id);
        const aiFeedbackMap = (player as any).aiFeedbackMap || {};
        socket.emit('unit-finished', { score: player.score, correctAnswers, aiFeedbackMap });
    });

    // Student: Register socket (for Duel Lobby presence)
    socket.on('student-register', ({ studentId }: { studentId: string }) => {
        (socket as any).studentId = studentId;
        studentSockets[studentId] = socket.id;
        console.log(`[Register] Student ${studentId} registered with socket ${socket.id}`);
    });

    // Duel: Invitation
    socket.on('duel-invite', async ({ targetStudentId, studentName }: { targetStudentId: string, studentName: string }) => {
        const targetSocketId = studentSockets[targetStudentId];
        if (targetSocketId) {
            io.to(targetSocketId).emit('duel-invited', { fromId: (socket as any).studentId, fromName: studentName });
            console.log(`[Duel] Invitation from ${studentName} to ${targetStudentId}`);
        } else {
            socket.emit('error', 'O\'quvchi hozirda onlayn emas');
        }
    });

    socket.on('duel-accept', async ({ fromId }: { fromId: string }) => {
        const fromSocketId = studentSockets[fromId];
        const studentId = (socket as any).studentId;
        if (!fromSocketId || !studentId) return;

        try {
            const studentRes = await query('SELECT g.level FROM students s JOIN groups g ON s.group_id = g.id WHERE s.id = $1', [studentId]);
            const level = studentRes.rows[0]?.level || 'Beginner';

            const quizRes = await query('SELECT id FROM unit_quizzes WHERE level = $1 ORDER BY RANDOM() LIMIT 1', [level]);
            if (quizRes.rowCount === 0) {
                socket.emit('error', 'Duel uchun mos test topilmadi');
                return;
            }
            const quizId = quizRes.rows[0].id;

            const duelId = uuidv4();
            await query(
                'INSERT INTO duels (id, player1_id, player2_id, quiz_id, status) VALUES ($1, $2, $3, $4, $5)',
                [duelId, fromId, studentId, quizId, 'active']
            );

            const pin = generatePin();
            const fullQuiz = (await query('SELECT * FROM unit_quizzes WHERE id = $1', [quizId])).rows[0];

            games[pin] = {
                pin,
                quiz: fullQuiz,
                hostId: 'system',
                players: [],
                status: 'ACTIVE',
                currentQuestionIndex: 0,
                isUnitQuiz: true,
                isDuel: true,
                duelId
            };

            io.to(socket.id).emit('duel-started', { pin, duelId });
            io.to(fromSocketId).emit('duel-started', { pin, duelId });
        } catch (err) {
            socket.emit('error', 'Duelni boshlashda xatolik');
        }
    });

    // Player/Student: Submit Answer
    socket.on('player-answer', async ({ pin, answer, questionIndex }: { pin: string, answer: string | number, questionIndex?: number }) => {
        const game = games[pin];
        if (!game || game.status !== 'ACTIVE') return;

        const playerId = (socket as any).studentId || socket.id;
        const player = game.players.find(p => p.id === playerId);
        if (!player) return;

        const qIdx = game.isUnitQuiz && questionIndex !== undefined ? questionIndex : game.currentQuestionIndex;
        if (qIdx < 0 || qIdx >= game.quiz.questions.length) {
            console.log(`[player-answer] Invalid qIdx: ${qIdx}, total: ${game.quiz.questions.length}`);
            return;
        }

        const question = game.quiz.questions[qIdx];
        if (!(player as any).partialScoreMap) (player as any).partialScoreMap = {};
        const prevPartialScore = (player as any).partialScoreMap[qIdx] || 0;

        let currentScore = 0;
        const textTypes = ['text-input', 'fill-blank', 'find-mistake', 'rewrite', 'word-box', 'matching'];

        if (question.type === 'matching' || question.type === 'word-box') {
            currentScore = countCorrectParts(String(answer), question.acceptedAnswers || []);
        } else if (textTypes.includes(question.type || '')) {
            if (checkAnswer(String(answer), question.acceptedAnswers || [])) {
                currentScore = 1;
            } else if (answer) {
                // Fallback to AI checking if the simple check fails
                try {
                    const aiResult = await checkAnswerWithAI(question.text, String(answer), question.type || 'text-input');

                    // Store feedback regardless of correctness so students see it in the PDF
                    (player as any).aiFeedbackMap = (player as any).aiFeedbackMap || {};
                    (player as any).aiFeedbackMap[qIdx] = aiResult.feedback;

                    if (aiResult.isCorrect) {
                        currentScore = 1;
                    }
                } catch (err) {
                    console.error('[player-answer] AI check failed:', err);
                }
            }
        } else {
            const ansIdx = Number(answer);
            if (ansIdx === question.correctIndex) {
                currentScore = 1;
            }
        }

        player.answers[qIdx] = answer;
        player.score = player.score - prevPartialScore + currentScore;
        (player as any).partialScoreMap[qIdx] = currentScore;

        console.log(`[player-answer] Success. Player ${player.name} answered qIdx ${qIdx}. Total answers: ${Object.keys(player.answers).length}`);

        if (game.isUnitQuiz) {
            broadcastPlayerUpdate(pin, player.id);
        } else {
            const answeredCount = game.players.filter(p => p.answers[game.currentQuestionIndex] !== undefined).length;
            io.to(game.hostId).emit('answers-count', answeredCount);
        }
    });
    socket.on('player-sync-answers', async ({ pin, answers }: { pin: string, answers: Record<string, string | number> }) => {
        const game = games[pin];
        if (!game || game.status !== 'ACTIVE') return;

        const playerId = (socket as any).studentId || socket.id;
        const player = game.players.find(p => p.id === playerId);
        if (!player) return;

        let hasUpdates = false;

        // Ensure partialScoreMap exists
        if (!(player as any).partialScoreMap) (player as any).partialScoreMap = {};

        for (const [qIdxStr, answer] of Object.entries(answers)) {
            const qIdx = parseInt(qIdxStr);
            if (isNaN(qIdx) || qIdx < 0 || qIdx >= game.quiz.questions.length) continue;

            // If the server doesn't have this answer yet, process it
            if (player.answers[qIdx] === undefined && answer !== undefined && answer !== null) {
                const question = game.quiz.questions[qIdx];
                let currentScore = 0;
                const textTypes = ['text-input', 'fill-blank', 'find-mistake', 'rewrite', 'word-box', 'matching'];

                if (question.type === 'matching' || question.type === 'word-box') {
                    currentScore = countCorrectParts(String(answer), question.acceptedAnswers || []);
                } else if (textTypes.includes(question.type || '')) {
                    if (checkAnswer(String(answer), question.acceptedAnswers || [])) {
                        currentScore = 1;
                    } else if (answer) {
                        try {
                            const aiResult = await checkAnswerWithAI(question.text, String(answer), question.type || 'text-input');
                            (player as any).aiFeedbackMap = (player as any).aiFeedbackMap || {};
                            (player as any).aiFeedbackMap[qIdx] = aiResult.feedback;
                            if (aiResult.isCorrect) currentScore = 1;
                        } catch (err) {
                            console.error('[player-sync-answers] AI check failed:', err);
                        }
                    }
                } else {
                    const ansIdx = Number(answer);
                    if (ansIdx === question.correctIndex) {
                        currentScore = 1;
                    }
                }

                player.answers[qIdx] = answer;
                player.score += currentScore;
                (player as any).partialScoreMap[qIdx] = currentScore;
                hasUpdates = true;
            }
        }

        if (hasUpdates) {
            console.log(`[player-sync-answers] Synced answers for ${player.name}. Total answers: ${Object.keys(player.answers).length}`);
            if (game.isUnitQuiz) {
                broadcastPlayerUpdate(pin, player.id);
            } else {
                const answeredCount = game.players.filter(p => p.answers[game.currentQuestionIndex] !== undefined).length;
                io.to(game.hostId).emit('answers-count', answeredCount);
            }
        }
    });
});

async function finishGame(pin: string) {
    const game = games[pin];
    if (!game) return;

    game.status = 'FINISHED';
    const leaderboard = [...game.players].sort((a, b) => b.score - a.score);
    io.to(pin).emit('game-over', leaderboard);

    if (game.isUnitQuiz) {
        const correctAnswers = (game.quiz.questions as any[]).map(q => ({
            type: q.type,
            correctIndex: q.correctIndex,
            acceptedAnswers: q.acceptedAnswers
        }));

        // Send individual results to all players still in the room
        game.players.forEach(p => {
            const playerSocketId = studentSockets[p.id];
            if (playerSocketId) {
                const aiFeedbackMap = (p as any).aiFeedbackMap || {};
                io.to(playerSocketId).emit('unit-finished', { score: p.score, correctAnswers, aiFeedbackMap });
            }
        });
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
            await query(
                'INSERT INTO game_results (id, group_id, quiz_title, total_questions, player_results) VALUES ($1, $2, $3, $4, $5)',
                [resultId, game.groupId, game.quiz.title, game.quiz.questions.length, JSON.stringify(game.players)]
            );

            const groupRes = await query('SELECT name, teacher_id FROM groups WHERE id = $1', [game.groupId]);
            if (groupRes.rowCount && groupRes.rowCount > 0) {
                const group = groupRes.rows[0];
                const teacherRes = await query('SELECT telegram_chat_id FROM teachers WHERE id = $1', [group.teacher_id]);
                const pdfBuffer = await generateQuizResultPDF(game.quiz, game.players, group.name);

                if (teacherRes.rowCount && teacherRes.rowCount > 0 && teacherRes.rows[0].telegram_chat_id) {
                    try {
                        const sanitizedGroupName = group.name.replace(/[^a-zA-Z0-9]/g, '_');
                        const filename = `Result_${sanitizedGroupName}_${Date.now()}.pdf`;
                        console.log(`[finishGame] Attempting to send PDF to teacher ${group.teacher_id} (Chat: ${teacherRes.rows[0].telegram_chat_id}, File: ${filename})`);

                        await bot.telegram.sendDocument(teacherRes.rows[0].telegram_chat_id, {
                            source: pdfBuffer,
                            filename: filename
                        }, {
                            caption: `📊 <b>${game.quiz.title}</b> natijalari\n🏫 Guruh: ${group.name}`,
                            parse_mode: 'HTML'
                        });
                        console.log(`[finishGame] PDF successfully sent to teacher.`);
                    } catch (e) {
                        console.error('[finishGame] PDF send error to teacher:', e);
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
                            caption: `📊 <b>${game.quiz.title}</b> (Menejer uchun)\n🏫 Guruh: ${group.name}\n👤 O'qituvchi: ${group.teacher_id}`,
                            parse_mode: 'HTML'
                        });
                    } catch (e) {
                        console.error('[finishGame] Manager PDF send error:', e);
                    }
                }

                // Bulk Update for XP & Coins
                bulkAwardRewards(game.players); // Executing async without blocking

                // Send to students (async without blocking finishGame)
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

function sendQuestion(pin: string) {
    const game = games[pin];
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

// Global Error Handler to prevent leaking stack traces
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, async () => {
    await initDb();
    launchBot();
    startSelfPinger();
    startWeeklySchedulers();
    console.log(`Server running on port ${PORT}`);
});
