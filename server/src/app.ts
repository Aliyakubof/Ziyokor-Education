import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { games, generatePin, generateStudentId } from './store';
import { query } from './db';
import { schema } from './schema';
import { GameSession, Player } from './types';

const app = express();
const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:5173'].filter(Boolean) as string[];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ["GET", "POST"]
}));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"]
    }
});

// Database Initialization
async function initDb() {
    try {
        await query(schema);
        console.log('Database initialized successfully');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
}

// Admin: Teachers
app.post('/api/admin/teachers', async (req, res) => {
    try {
        const { name, phone } = req.body;
        const password = phone.slice(-4);
        const id = uuidv4();
        await query(
            'INSERT INTO teachers (id, name, phone, password) VALUES ($1, $2, $3, $4)',
            [id, name, phone, password]
        );
        res.json({ id, name, phone, password });
    } catch (err) {
        res.status(500).json({ error: 'Error creating teacher' });
    }
});

app.get('/api/admin/teachers', async (req, res) => {
    try {
        const result = await query('SELECT * FROM teachers');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching teachers' });
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
    } catch (err) {
        res.status(500).json({ error: 'Error fetching unit quizzes' });
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
app.post('/api/students', async (req, res) => {
    try {
        const { name, groupId } = req.body;
        const id = await generateStudentId();
        await query(
            'INSERT INTO students (id, name, group_id) VALUES ($1, $2, $3)',
            [id, name, groupId]
        );
        res.json({ id, name, groupId, status: 'Offline' });
    } catch (err) {
        res.status(500).json({ error: 'Error creating student' });
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
    } catch (err) {
        res.status(500).json({ error: 'Error fetching quiz' });
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
            answers: {}
        };
        game.players.push(player);
        socket.join(pin);

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

            let player = game.players.find(p => p.id === studentId);
            if (player) {
                player.status = 'Online';
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

        const player = game.players.find(p => p.id === studentId);
        if (player) {
            player.status = status;
            io.to(game.hostId).emit('player-update', game.players);
        }
    });

    // Host: Start Game
    socket.on('host-start-game', (pin: string) => {
        const game = games[pin];
        if (!game || game.hostId !== socket.id) return;

        game.status = 'ACTIVE';
        game.currentQuestionIndex = 0;
        io.to(pin).emit('game-started');
        sendQuestion(pin);
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
        } else {
            sendQuestion(pin);
        }
    });

    // Player/Student: Submit Answer
    socket.on('player-answer', ({ pin, answerIndex }: { pin: string, answerIndex: number }) => {
        const game = games[pin];
        if (!game || game.status !== 'ACTIVE') return;

        // Identification: use studentId from socket if exists (unit quiz), else use socket.id (normal quiz)
        const playerId = (socket as any).studentId || socket.id;
        const player = game.players.find(p => p.id === playerId);

        if (!player) return;

        const question = game.quiz.questions[game.currentQuestionIndex];
        if (player.answers[game.currentQuestionIndex] !== undefined) return;

        player.answers[game.currentQuestionIndex] = answerIndex;

        if (answerIndex === question.correctIndex) {
            player.score += 100;
        }

        const answeredCount = game.players.filter(p => p.answers[game.currentQuestionIndex] !== undefined).length;
        io.to(game.hostId).emit('answers-count', answeredCount);
    });
});

// Helper for socket player identification - studentId is now stored on the socket object.

function sendQuestion(pin: string) {
    const game = games[pin];
    const question = game.quiz.questions[game.currentQuestionIndex];

    io.to(game.hostId).emit('question-new', {
        text: question.text,
        options: question.options,
        correctIndex: question.correctIndex,
        timeLimit: question.timeLimit,
        questionIndex: game.currentQuestionIndex + 1,
        totalQuestions: game.quiz.questions.length
    });

    io.to(pin).except(game.hostId).emit('question-start', {
        questionIndex: game.currentQuestionIndex + 1,
        optionsCount: question.options.length
    });
}

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, async () => {
    await initDb();
    console.log(`Server running on port ${PORT}`);
});
