import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { games, generatePin, generateStudentId } from './store';
import { query } from './db';
import { schema } from './schema';
import { Player } from './types';
import { bot, launchBot } from './bot';
import { generateQuizResultPDF } from './pdfGenerator';

const app = express();
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost',
    'https://ziyokor-education.vercel.app'
].filter(Boolean) as string[];

app.use(cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

const ADMIN_ID = '00000000-0000-0000-0000-000000000000';

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
        console.log('Database initialized successfully');
        await ensureAdminExists();
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
    const { phone, password } = req.body;

    // Hardcoded Admin
    if (phone === '998901234567' && password === '4567') {
        return res.json({
            user: { id: ADMIN_ID, name: 'Admin', phone: '998901234567' },
            role: 'admin'
        });
    }

    // Teacher Login from Database
    try {
        const result = await query(
            'SELECT id, name, phone FROM teachers WHERE phone = $1 AND password = $2',
            [phone, password]
        );

        if (result.rowCount && result.rowCount > 0) {
            return res.json({
                user: result.rows[0],
                role: 'teacher'
            });
        }

        res.status(401).json({ error: 'Telefon raqam yoki parol noto\'g\'ri' });
    } catch (err) {
        res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
    }
});

// Admin: Teachers
app.post('/api/admin/teachers', async (req, res) => {
    try {
        const { name, phone, password } = req.body;
        // Use provided password or fallback to last 4 digits of phone
        const finalPassword = password || phone.slice(-4);
        const id = uuidv4();
        await query(
            'INSERT INTO teachers (id, name, phone, password) VALUES ($1, $2, $3, $4)',
            [id, name, phone, finalPassword]
        );
        res.json({ id, name, phone, password: finalPassword });
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

        await query(
            'UPDATE teachers SET name = $1, phone = $2, password = $3 WHERE id = $4',
            [name, phone, password, id]
        );

        res.json({ id, name, phone, password });
    } catch (err) {
        console.error('Error updating teacher:', err);
        res.status(500).json({ error: 'Error updating teacher' });
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

// Admin: Unit Quizzes
app.post('/api/unit-quizzes', async (req, res) => {
    try {
        const { title, questions, level, unit } = req.body;
        const id = uuidv4();
        await query(
            'INSERT INTO unit_quizzes (id, title, questions, level, unit) VALUES ($1, $2, $3, $4, $5)',
            [id, title, JSON.stringify(questions), level, unit]
        );
        res.json({ id, title, questions, level, unit });
    } catch (err) {
        res.status(500).json({ error: 'Error creating unit quiz' });
    }
});

app.get('/api/unit-quizzes', async (req, res) => {
    try {
        const result = await query('SELECT * FROM unit_quizzes');
        res.json(result.rows);
    } catch (err: any) {
        console.error('Error fetching unit quizzes:', err);
        res.status(500).json({ error: 'Error fetching unit quizzes', details: err.message });
    }
});

// Teacher: Groups
app.post('/api/groups', async (req, res) => {
    try {
        const { name, teacherId } = req.body;
        const id = uuidv4();
        await query(
            'INSERT INTO groups (id, name, teacher_id) VALUES ($1, $2, $3)',
            [id, name, teacherId]
        );
        res.json({ id, name, teacherId });
    } catch (err) {
        res.status(500).json({ error: 'Error creating group' });
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

// Teacher: Students
// Removed duplicate /api/admin/groups route


app.post('/api/students', async (req, res) => {
    try {
        const { name, groupId, phone, parentName, parentPhone } = req.body;
        const id = await generateStudentId();
        await query(
            'INSERT INTO students (id, name, group_id, phone, parent_name, parent_phone) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, name, groupId, phone, parentName, parentPhone]
        );
        res.json({ id, name, groupId, phone, parentName, parentPhone, status: 'Offline' });
    } catch (err) {
        res.status(500).json({ error: 'Error creating student' });
    }
});

app.get('/api/students/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);

        const result = await query(`
            SELECT s.id, s.name, s.group_id, g.name as group_name
            FROM students s
            JOIN groups g ON s.group_id = g.id
            WHERE s.name ILIKE $1 OR s.id ILIKE $1
            LIMIT 20
        `, [`%${q}%`]);

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
            if (student.password !== password) {
                return res.status(401).json({ error: 'Parol noto\'g\'ri' });
            }
        } else {
            // First time login: Set password
            await query('UPDATE students SET password = $1 WHERE id = $2', [password, id]);
        }

        res.json({
            token: 'mock-jwt-token', // In real app use JWT
            user: {
                id: student.id,
                name: student.name,
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

app.get('/api/student/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;

        // Games Played & Total Score
        const gamesRes = await query(`
            SELECT COUNT(*) as games_count
            FROM game_results, jsonb_array_elements(player_results) as player
            WHERE player->>'id' = $1
        `, [id]);

        const scoreRes = await query(`
            SELECT SUM((player->>'score')::int) as total_score
            FROM game_results, jsonb_array_elements(player_results) as player
            WHERE player->>'id' = $1
        `, [id]);

        // Get Group Rank (Simplified: based on total score of all students in same group)
        // This is complex query, for now returning mock or simple calculation

        res.json({
            gamesPlayed: parseInt(gamesRes.rows[0].games_count) || 0,
            totalScore: parseInt(scoreRes.rows[0].total_score) || 0,
            rank: 1 // Placeholder for now
        });
    } catch (err) {
        console.error('Stats error:', err);
        res.status(500).json({ error: 'Error fetching stats' });
    }
});

app.get('/api/student/:id/history', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query(`
            SELECT 
                quiz_title, 
                created_at, 
                player->>'score' as score,
                total_questions,
                (player->>'score')::int * 100 / (total_questions * 100) as percentage
            FROM game_results, jsonb_array_elements(player_results) as player
            WHERE player->>'id' = $1
            ORDER BY created_at DESC
            LIMIT 50
        `, [id]);

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching history' });
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
            // Identify player by socket.id or studentId
            const player = game.players.find(p => p.id === socket.id || p.id === (socket as any).studentId);
            if (player) {
                player.status = 'Offline';
                io.to(game.hostId).emit('player-update', game.players);
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

            // Store studentId on the socket for identification during answers
            (socket as any).studentId = studentId;
            (socket as any).pin = pin;

            let player = game.players.find(p => p.id === studentId);
            if (player) {
                player.status = 'Online';
                // Update socket ID? Probably not needed if we use studentId primarily but good for emit targets
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
            io.to(game.hostId).emit('player-update', game.players);
        } catch (err) {
            socket.emit('error', 'Database error');
        }
    });

    // Student: Status Update (Anti-Cheat)
    socket.on('student-status-update', ({ pin, studentId, status }: { pin: string, studentId: string, status: 'Online' | 'Cheating' }) => {
        const game = games[pin];
        if (!game) return;

        const player = game.players.find(p => p.id === studentId || p.id === socket.id);
        if (player) {
            player.status = status;
            io.to(game.hostId).emit('player-update', game.players);
        }
    });

    // Host: Start Game
    socket.on('host-start-game', ({ pin, timeLimit }: { pin: string, timeLimit: number }) => {
        const game = games[pin];
        if (!game || game.hostId !== socket.id) return;

        game.status = 'ACTIVE';
        game.currentQuestionIndex = 0;

        // Timer Logic
        // Timer Logic
        let durationMinutes = timeLimit; // Trust client if provided

        if (!durationMinutes) {
            if (game.isUnitQuiz && 'time_limit' in game.quiz) {
                durationMinutes = game.quiz.time_limit || 30;
            } else {
                durationMinutes = 30;
            }
        }

        const endTime = Date.now() + durationMinutes * 60 * 1000;
        game.endTime = endTime;

        io.to(pin).emit('game-started', { endTime });
        // Unit quiz starts with all questions available or just starts the timer? 
        // Assuming unit quiz is self-paced or has a global timer for all questions.
        // For now, let's stick to the current flow but send the global timer.

        if (game.isUnitQuiz) {
            // For Unit Quiz, we might want to send the first question or just start
            // If PlayerGame handles fetching questions, we just signal start.
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
            game.status = 'FINISHED';
            const leaderboard = [...game.players].sort((a, b) => b.score - a.score);
            io.to(pin).emit('game-over', leaderboard);

            // Save Game Results
            if (game.isUnitQuiz && game.groupId) {
                (async () => {
                    try {
                        const resultId = uuidv4();
                        const totalQuestions = game.quiz.questions.length;
                        await query(
                            'INSERT INTO game_results (id, group_id, quiz_title, total_questions, player_results) VALUES ($1, $2, $3, $4, $5)',
                            [resultId, game.groupId, game.quiz.title, totalQuestions, JSON.stringify(game.players)]
                        );
                        console.log(`Game results saved for group ${game.groupId}`);
                    } catch (err) {
                        console.error('Error saving game results:', err);
                    }
                })();
            }

            // PDF Sending Logic
            if (game.isUnitQuiz && game.groupId) {
                (async () => {
                    try {
                        const groupRes = await query('SELECT name, teacher_id FROM groups WHERE id = $1', [game.groupId]);
                        if (groupRes.rowCount === 0) return;
                        const group = groupRes.rows[0];

                        const teacherRes = await query('SELECT telegram_chat_id FROM teachers WHERE id = $1', [group.teacher_id]);
                        if (teacherRes.rowCount === 0) return;
                        const teacher = teacherRes.rows[0];

                        const pdfBuffer = await generateQuizResultPDF(game.quiz, game.players, group.name);

                        if (teacher.telegram_chat_id) {
                            await bot.telegram.sendDocument(teacher.telegram_chat_id, {
                                source: pdfBuffer,
                                filename: `Result_${group.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`
                            }, {
                                caption: `📊 <b>${game.quiz.title}</b> natijalari\n🏫 Guruh: ${group.name}`,
                                parse_mode: 'HTML'
                            });
                            console.log(`PDF sent to teacher ${group.teacher_id}`);
                        }

                        // Send to Students/Parents
                        for (const player of game.players) {
                            const subRes = await query(
                                'SELECT telegram_chat_id FROM student_telegram_subscriptions WHERE student_id = $1',
                                [player.id]
                            );

                            for (const sub of subRes.rows) {
                                try {
                                    await bot.telegram.sendDocument(sub.telegram_chat_id, {
                                        source: pdfBuffer,
                                        filename: `Result_${group.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`
                                    }, {
                                        caption: `📊 <b>${game.quiz.title}</b> natijalari\n🏫 Guruh: ${group.name}\n👤 O'quvchi: ${player.name}`,
                                        parse_mode: 'HTML'
                                    });
                                } catch (e) {
                                    console.error(`Failed to send PDF to student ${player.name}`, e);
                                }
                            }
                        }
                    } catch (err) {
                        console.error('Error sending PDF to Telegram:', err);
                    }
                })();
            }
        } else {
            sendQuestion(pin);
        }
    });

    // Player/Student: Submit Answer
    socket.on('player-answer', ({ pin, answer }: { pin: string, answer: string | number }) => {
        const game = games[pin];
        if (!game || game.status !== 'ACTIVE') return;

        // Identification: use studentId from socket if exists (unit quiz), else use socket.id (normal quiz)
        const playerId = (socket as any).studentId || socket.id;
        const player = game.players.find(p => p.id === playerId);

        if (!player) return;

        const question = game.quiz.questions[game.currentQuestionIndex];
        if (player.answers[game.currentQuestionIndex] !== undefined) return;

        // Validation Logic
        let isCorrect = false;
        if (question.type === 'text-input') {
            const normalizedAnswer = String(answer).trim().toLowerCase();
            if (question.acceptedAnswers && question.acceptedAnswers.some(ans => ans.trim().toLowerCase() === normalizedAnswer)) {
                isCorrect = true;
            }
            // Store the text answer (as a string, but type says number... we might need to adjust logic or just store hash/flag)
            // For simplicity in current structure which expects mapping [qIdx] -> answerIdx,
            // we can store -1 for incorrect, and -2 for correct text answer?
            // OR better: we store 1 for correct, 0 for incorrect.
            // However, the current type is Record<string, number>.
            // Let's store 1 if correct, 0 if incorrect for text-input.
            player.answers[game.currentQuestionIndex] = isCorrect ? 1 : 0;
        } else {
            // Multiple Choice
            const ansIdx = Number(answer);
            player.answers[game.currentQuestionIndex] = ansIdx;
            if (ansIdx === question.correctIndex) {
                isCorrect = true;
            }
        }

        if (isCorrect) {
            player.score += 100;
        }

        const answeredCount = game.players.filter(p => p.answers[game.currentQuestionIndex] !== undefined).length;
        io.to(game.hostId).emit('answers-count', answeredCount);
    });
});

function sendQuestion(pin: string) {
    const game = games[pin];
    const question = game.quiz.questions[game.currentQuestionIndex];

    // Use the calculated global time per question, fallback to question limit or d
    const timeLimit = game.timePerQuestion || question.timeLimit || 20;

    io.to(game.hostId).emit('question-new', {
        text: question.text,
        options: question.options,
        correctIndex: question.correctIndex,
        timeLimit: timeLimit,
        questionIndex: game.currentQuestionIndex + 1,
        totalQuestions: game.quiz.questions.length,
        type: question.type,
        acceptedAnswers: question.acceptedAnswers
    });

    const questionDataForPlayer: any = {
        questionIndex: game.currentQuestionIndex + 1,
        timeLimit: timeLimit,
        type: question.type
    };

    if (question.type !== 'text-input') {
        questionDataForPlayer.optionsCount = question.options.length;
        questionDataForPlayer.options = question.options; // Send options to player if needed, though originally we didn't send text
        // Actually PlayerGame only needs to know it's started. But for text input we need to tell it type.
    } else {
        questionDataForPlayer.text = question.text; // Send text for text-input
    }

    io.to(pin).except(game.hostId).emit('question-start', questionDataForPlayer);
}

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, async () => {
    await initDb();
    launchBot();
    console.log(`Server running on port ${PORT}`);
});
