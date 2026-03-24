import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { Worker } from 'worker_threads';
import { store, generatePin, generateParentId } from './store';
import { query } from './db';
import { bot } from './bot';
import { ADMIN_ID, MANAGER_ID } from './constants';
import { generateQuizResultPDF, generateGroupContactPDF } from './pdfGenerator';
import { checkAnswer, countCorrectParts } from './utils';
import { checkAnswersWithAIBatch } from './aiChecker';
import { bulkAwardRewards } from './services/rewardService';

const RESULTS_DIR = path.join(__dirname, '..', 'storage', 'results');

// Throttling mechanism for unit quiz updates
const updateThrottles: Record<string, NodeJS.Timeout | null> = {};
const pendingPlayerUpdates: Record<string, Set<string>> = {};

// AI Queue Manager
const aiCheckQueues: Record<string, { pin: string, playerId: string, qIdx: number, text: string, answer: string, type: string, acceptedAnswers?: string[] }[]> = {};
const aiQueueThrottles: Record<string, NodeJS.Timeout | null> = {};
const activeAIPromises: Record<string, Promise<void>[]> = {};

function scrubPlayers(game: any, players?: any[]) {
    const list = players || game.players || [];
    if (game.isUnitQuiz) {
        return list.map((p: any) => scrubSinglePlayer(game, p));
    }
    return list;
}

function scrubSinglePlayer(game: any, p: any) {
    if (game.isUnitQuiz) {
        let questions = game.quiz?.questions;
        if (typeof questions === 'string') {
            try { questions = JSON.parse(questions); } catch (e) { questions = []; }
        }
        const questionsArr = Array.isArray(questions) ? questions : [];
        
        const answeredCount = Object.entries(p.answers || {}).filter(([qIdx, a]) => {
            const idx = Number(qIdx);
            const isValidAnswer = a !== "" && a !== null && a !== undefined;
            const isNotInfoSlide = questionsArr[idx]?.type !== 'info-slide';
            return isValidAnswer && isNotInfoSlide;
        }).length;


        return {
            id: p.id,
            name: p.name,
            answeredCount,
            status: p.status,
            isFinished: p.isFinished,
            isCheater: p.isCheater,
            avatar_url: p.avatar_url
        };
    }
    return p;
}

async function broadcastPlayerUpdate(io: Server, pin: string, playerId?: string) {
    if (!pendingPlayerUpdates[pin]) pendingPlayerUpdates[pin] = new Set();
    if (playerId) {
        pendingPlayerUpdates[pin].add(playerId);
    } else {
        pendingPlayerUpdates[pin].add('ALL');
    }

    if (updateThrottles[pin]) return;

    updateThrottles[pin] = setTimeout(async () => {
        const metadata = await store.getGameMetadata(pin);
        if (!metadata || !metadata.hostId || metadata.hostId === 'system') {
            updateThrottles[pin] = null;
            return;
        }

        const updates = Array.from(pendingPlayerUpdates[pin]);
        pendingPlayerUpdates[pin].clear();
        updateThrottles[pin] = null;

        if (updates.length === 0) return;

        try {
            console.log(`[broadcastPlayerUpdate] Processing ${updates.length} updates for pin ${pin}. Throttled 1s.`);
            if (updates.includes('ALL')) {
                const fullGame = await store.getGame(pin);
                if (fullGame) {
                    io.to(pin).emit('player-update', scrubPlayers(fullGame));
                    console.log(`[broadcastPlayerUpdate] Emitted player-update (FULL) to pin ${pin}. Players: ${fullGame.players.length}`);
                }
            } else {
                const changedPlayers: any[] = [];
                for (const pId of updates) {
                    if (pId === 'ALL') continue;
                    const p = await store.getPlayer(pin, pId as string);
                    if (p) {
                        const scrubbed = scrubSinglePlayer(metadata, p);
                        changedPlayers.push(scrubbed);
                    }
                }

                if (changedPlayers.length > 0) {
                    io.to(pin).emit('player-update-delta', changedPlayers);
                    console.log(`[broadcastPlayerUpdate] Emitted player-update-delta to pin ${pin} for ${changedPlayers.length} players. IDs: ${changedPlayers.map(p => p.id).join(', ')}`);
                }
            }
        } catch (err) {
            console.error('[broadcastPlayerUpdate] Error:', err);
        }
    }, 1000);
}

async function processAIBatch(io: Server, pin: string, queue: any[]) {
    try {
        console.log(`[AI Queue] Processing ${queue.length} items for pin ${pin}...`);
        const results = await checkAnswersWithAIBatch(queue.map(item => ({
            text: item.text,
            studentAnswer: item.answer,
            type: item.type,
            acceptedAnswers: item.acceptedAnswers
        })));

        let modCount = 0;
        const uniquePlayerIds = new Set(queue.map((item: any) => item.playerId));

        for (const pId of uniquePlayerIds) {
            const player = await store.getPlayer(pin, pId as string);
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
                } else {
                    playerModded = true;
                }
            });

            if (playerModded) {
                await store.setPlayer(pin, player);
                await broadcastPlayerUpdate(io, pin, pId as string);
            }
        }
        console.log(`[AI Queue] Finished batch for pin ${pin}. Updated ${modCount} scores.`);
    } catch (err) {
        console.error('[AI Queue] Background processing error:', err);
    }
}

async function enqueueAICheck(io: Server, pin: string, playerId: string, qIdx: number, text: string, answer: string, type: string, acceptedAnswers?: string[]) {
    if (!aiCheckQueues[pin]) aiCheckQueues[pin] = [];
    aiCheckQueues[pin].push({ pin, playerId, qIdx, text, answer, type, acceptedAnswers });

    if (aiQueueThrottles[pin]) return;

    aiQueueThrottles[pin] = setTimeout(async () => {
        const queue = aiCheckQueues[pin];
        delete aiCheckQueues[pin];
        aiQueueThrottles[pin] = null;

        if (!queue || queue.length === 0) return;

        if (!activeAIPromises[pin]) activeAIPromises[pin] = [];
        const promise = processAIBatch(io, pin, queue);
        activeAIPromises[pin].push(promise);
        
        try {
            await promise;
        } finally {
            if (activeAIPromises[pin]) {
                activeAIPromises[pin] = activeAIPromises[pin].filter(p => p !== promise);
            }
        }
    }, 4000);
}

async function flushAndAwaitAI(io: Server, pin: string) {
    if (aiQueueThrottles[pin]) {
        clearTimeout(aiQueueThrottles[pin]!);
        aiQueueThrottles[pin] = null;
        const queue = aiCheckQueues[pin];
        if (queue && queue.length > 0) {
            delete aiCheckQueues[pin];
            if (!activeAIPromises[pin]) activeAIPromises[pin] = [];
            const promise = processAIBatch(io, pin, queue);
            activeAIPromises[pin].push(promise);
            promise.finally(() => {
                if (activeAIPromises[pin]) {
                    activeAIPromises[pin] = activeAIPromises[pin].filter(p => p !== promise);
                }
            }).catch(e => console.error("Flush AI error:", e));
        }
    }
    
    if (activeAIPromises[pin] && activeAIPromises[pin].length > 0) {
        console.log(`[finishGame] Awaiting ${activeAIPromises[pin].length} active AI checks for pin ${pin}...`);
        await Promise.allSettled(activeAIPromises[pin]);
    }
}
function generatePDFInWorker(quiz: any, players: any, groupName: string, teacherName: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        try {
            const isTS = __filename.endsWith('.ts') || !!(process as any)._preload_modules?.includes('ts-node/register');
            const workerScript = path.join(__dirname, 'worker', isTS ? 'pdfWorker.ts' : 'pdfWorker.js');

            const worker = new Worker(workerScript, {
                workerData: { quiz, players, groupName, teacherName },
                execArgv: isTS ? ['--loader', 'ts-node/esm'] : []
            });

            worker.on('message', (msg) => {
                if (msg.success) {
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

async function finishGame(io: Server, pin: string) {
    try {
        console.log(`[finishGame] Starting for pin ${pin}`);
        
        // Ensure AI checks are fully processed before finishing
        await flushAndAwaitAI(io, pin);

        const game = await store.getGame(pin);
        if (!game) {
            console.log(`[finishGame] Game not found for pin ${pin}`);
            return;
        }

        // Mark game as finished in store
        game.status = 'FINISHED';
        await store.setGame(pin, game);

        const leaderboard = [...game.players].sort((a, b) => b.score - a.score);
        if (game.isUnitQuiz) {
            const hiddenLeaderboard = leaderboard.map(p => ({ ...p, score: 0 }));
            if (game.hostId && game.hostId !== 'system') {
                io.to(game.hostId).emit('game-over', leaderboard);
            }
            io.to(pin).emit('game-over', hiddenLeaderboard);
            io.to(pin).emit('unit-finished', { hidden: true });
            console.log(`[finishGame] Emitted unit-finished and game-over to pin ${pin}`);
        } else {
            io.to(pin).emit('game-over', leaderboard);
        }

        if (game.isDuel && game.duelId) {
            const p1 = game.players[0];
            const p2 = game.players[1];
            
            let winnerId = null;
            if (p1 && p2) {
                if ((p1.hp || 0) > (p2.hp || 0)) winnerId = p1.id;
                else if ((p2.hp || 0) > (p1.hp || 0)) winnerId = p2.id;
                else if (p1.score > p2.score) winnerId = p1.id;
                else if (p2.score > p1.score) winnerId = p2.id;
            }

            await query(
                'UPDATE duels SET player1_score = $1, player2_score = $2, winner_id = $3, status = $4 WHERE id = $5',
                [p1?.score || 0, p2?.score || 0, winnerId, 'completed', game.duelId]
            );
            console.log(`[finishGame] Duel ${game.duelId} marked as completed.`);
        }

        let questions: any[] = [];
        try {
            const quizQuestions = game.quiz?.questions;
            if (Array.isArray(quizQuestions)) {
                questions = quizQuestions;
            } else if (typeof quizQuestions === 'string') {
                questions = JSON.parse(quizQuestions);
            }
        } catch (e) {
            console.error(`[finishGame] Error parsing questions:`, e);
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

        // 1. Save results to DB
        try {
            console.log(`[finishGame] Inserting game results to DB for group ${game.groupId}`);
            await query(
                'INSERT INTO game_results (id, group_id, quiz_title, total_questions, player_results) VALUES ($1, $2, $3, $4, $5)',
                [uuidv4(), game.groupId || null, game.quiz.title, totalPossibleScore, JSON.stringify(game.players)]
            );
            console.log(`[finishGame] DB insertion successful.`);
        } catch (dbErr) {
            console.error(`[finishGame] Database insertion failed:`, dbErr);
        }

        // 2. Generate and Send PDF
        try {
            let groupName = 'Noma\'lum Guruh';
            let teacherName = 'Noma\'lum O\'qituvchi';
            let teacherChatId = null;

            if (game.groupId) {
                const groupRes = await query('SELECT name, teacher_id FROM groups WHERE id = $1', [game.groupId]);
                if (groupRes.rowCount && groupRes.rowCount > 0) {
                    groupName = groupRes.rows[0].name;
                    const teacherRes = await query('SELECT name, telegram_chat_id FROM teachers WHERE id = $1', [groupRes.rows[0].teacher_id]);
                    if (teacherRes.rowCount && teacherRes.rowCount > 0) {
                        teacherName = teacherRes.rows[0].name;
                        teacherChatId = teacherRes.rows[0].telegram_chat_id;
                    }
                } else {
                    console.log(`[finishGame] Group ID ${game.groupId} not found in DB.`);
                }
            } else {
                console.log(`[finishGame] No group ID in game state.`);
            }

            console.log(`[finishGame] Generating PDF for ${groupName} by ${teacherName}...`);
            let pdfBuffer: Buffer;
            try {
                pdfBuffer = await generatePDFInWorker(game.quiz, game.players, groupName, teacherName);
            } catch (workerErr) {
                console.error(`[finishGame] Worker PDF generation failed, falling back:`, workerErr);
                pdfBuffer = await generateQuizResultPDF(game.quiz, game.players, groupName, teacherName);
            }

            const sanitizedGroupName = groupName.replace(/[^a-zA-Z0-9]/g, '_');
            const pdfFilename = `Result_${sanitizedGroupName}_${Date.now()}.pdf`;
            const pdfCaption = `📊 <b>${game.quiz.title}</b> natijalari\n🏫 Guruh: ${groupName}\n👤 O'qituvchi: ${teacherName}`;

            const sendPromises = [];

            // Send to Teacher
            if (teacherChatId) {
                console.log(`[finishGame] Sending PDF to Teacher: ${teacherChatId}`);
                sendPromises.push(bot.telegram.sendDocument(teacherChatId, {
                    source: pdfBuffer,
                    filename: pdfFilename
                }, {
                    caption: pdfCaption,
                    parse_mode: 'HTML'
                }).then(() => console.log(`[finishGame] PDF sent to Teacher.`))
                  .catch(err => console.error(`[finishGame] Failed to send PDF to Teacher (${teacherChatId}):`, err)));
            } else {
                console.log(`[finishGame] Skipping Teacher Telegram: No chat ID.`);
            }

            // Send to Admin & Manager
            const oversightRes = await query('SELECT name, telegram_chat_id FROM teachers WHERE id = ANY($1) AND telegram_chat_id IS NOT NULL', [[ADMIN_ID, MANAGER_ID]]);
            console.log(`[finishGame] Oversight recipients found: ${oversightRes.rows.length}`);
            oversightRes.rows.forEach((row: any) => {
                if (row.telegram_chat_id && row.telegram_chat_id !== teacherChatId) {
                    console.log(`[finishGame] Sending PDF to Oversight (${row.name}): ${row.telegram_chat_id}`);
                    sendPromises.push(bot.telegram.sendDocument(row.telegram_chat_id, {
                        source: pdfBuffer,
                        filename: pdfFilename
                    }, {
                        caption: `${pdfCaption}\n👤 Mas'ul: ${row.name}`,
                        parse_mode: 'HTML'
                    }).then(() => console.log(`[finishGame] PDF sent to Oversight (${row.name}).`))
                      .catch(err => console.error(`[finishGame] Failed to send PDF to Oversight (${row.name}):`, err)));
                }
            });

            await Promise.allSettled(sendPromises);
        } catch (pdfErr) {
            console.error(`[finishGame] PDF/Telegram process failed:`, pdfErr);
        }

        // 3. Award Rewards
        try {
            bulkAwardRewards(game.players);
        } catch (rewardErr) {
            console.error(`[finishGame] Failed to award rewards:`, rewardErr);
        }

    } catch (err) {
        console.error(`[finishGame] Global Critical error:`, err);
    }
}

async function sendQuestion(io: Server, pin: string) {
    const game = await store.getGame(pin);
    if (!game) return;

    let questions = game.quiz.questions;
    if (typeof questions === 'string') {
        try { questions = JSON.parse(questions); } catch (e) { questions = []; }
    }
    const questionsArr = Array.isArray(questions) ? questions : [];
    const question = questionsArr[game.currentQuestionIndex];
    if (!question) return;

    const timeLimit = game.timePerQuestion || question.timeLimit || 20;

    io.to(game.hostId).emit('question-new', {
        ...question,
        timeLimit,
        questionIndex: game.currentQuestionIndex + 1,
        totalQuestions: questionsArr.length
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

    io.to(pin).except(game.hostId).emit('question-start', {
        ...questionDataForPlayer,
        startTime: Date.now()
    });
}

export function initSocket(io: Server) {
    io.on('connection', (socket: Socket) => {
        console.log('New client connected:', socket.id);

        // Host: Create Game (Standard Quizzes)
        socket.on('host-create-game', async (data: any) => {
            try {
                const quizId = typeof data === 'string' ? data : data.quizId;
                const clientHostId = typeof data === 'object' ? data.hostId : null;

                const result = await query('SELECT * FROM quizzes WHERE id = $1', [quizId]);
                if (result.rowCount === 0) {
                    socket.emit('error', 'Quiz not found');
                    return;
                }
                const quiz = result.rows[0];

                // Persistence: Check if this host already has an active lobby for this quiz
                if (clientHostId) {
                    const allGames = await store.getAllGames();
                    const existingGamePin = Object.keys(allGames).find(pin => {
                        const g = allGames[pin];
                        return !g.isUnitQuiz && g.quiz.id === quizId && 
                               (g as any).hostId_original === clientHostId && 
                               g.status !== 'FINISHED';
                    });

                    if (existingGamePin) {
                        const g = allGames[existingGamePin];
                        g.hostId = socket.id; // Update current socket
                        await store.setGame(existingGamePin, g);
                        socket.join(existingGamePin);
                        socket.emit('game-created', existingGamePin);
                        
                        // Send existing players if any
                        const players = g.players || [];
                        socket.emit('player-update', players);
                        
                        console.log(`[host-create-game] Recovered existing lobby: ${existingGamePin} for host ${clientHostId}`);
                        return;
                    }
                }

                const pin = await generatePin();
                const game = {
                    pin,
                    quiz,
                    hostId: socket.id,
                    hostId_original: clientHostId, // Store original ID for persistence
                    players: [],
                    status: 'LOBBY' as 'LOBBY',
                    currentQuestionIndex: -1,
                    isUnitQuiz: false,
                    createdAt: Date.now()
                };
                await store.setGame(pin, game);
                socket.join(pin);
                socket.emit('game-created', pin);
            } catch (err) {
                console.error('[host-create-game] error:', err);
                socket.emit('error', 'Database error');
            }
        });

        // Host: Create Unit Game
        socket.on('host-create-unit-game', async ({ quizId, groupId, hostId }: { quizId: string, groupId: string, hostId?: string }) => {
            try {
                // Check if a game already exists for this (quizId, groupId) that is not FINISHED
                const allGames = await store.getAllGames();
                const existingGamePin = Object.keys(allGames).find(pin => {
                    const g = allGames[pin];
                    return g.isUnitQuiz && g.groupId === groupId && 
                           (typeof g.quiz === 'object' ? g.quiz.id === quizId : g.quiz === quizId) && 
                           g.status !== 'FINISHED';
                });

                if (existingGamePin) {
                    const game = allGames[existingGamePin];
                    game.hostId = socket.id; // Update hostId to current socket
                    if (hostId) (game as any).hostId_original = hostId;
                    await store.setGame(existingGamePin, game);
                    socket.join(existingGamePin);
                    socket.emit('game-created', existingGamePin);
                    
                    // Also broadcast current players to the rejoined host
                    const fullGame = await store.getGame(existingGamePin);
                    if (fullGame) {
                        socket.emit('player-update', scrubPlayers(fullGame));
                    }
                    console.log(`[host-create-unit-game] Reconnected to existing unit game: ${existingGamePin}`);
                    return;
                }

                const result = await query('SELECT * FROM unit_quizzes WHERE id = $1', [quizId]);
                if (result.rowCount === 0) return socket.emit('error', 'Quiz topilmadi');
                
                const quiz = result.rows[0];
                const pin = await generatePin();
                const game = {
                    pin,
                    quiz,
                    groupId,
                    hostId: socket.id,
                    hostId_original: hostId,
                    players: [],
                    status: 'LOBBY' as 'LOBBY',
                    currentQuestionIndex: -1,
                    isUnitQuiz: true,
                    createdAt: Date.now()
                };
                await store.setGame(pin, game);
                socket.join(pin);
                socket.emit('game-created', pin);
            } catch (err) {
                console.error('[host-create-unit-game] error:', err);
                socket.emit('error', 'Xatolik yuz berdi');
            }
        });

        // Common events
        socket.on('join-game', async ({ pin, name, isRejoin, studentId }: { pin: string, name: string, isRejoin?: boolean, studentId?: string }) => {
            const game = await store.getGame(pin);
            if (!game) {
                socket.emit('error', 'O\'yin topilmadi');
                return;
            }

            if (game.status === 'FINISHED') {
                socket.emit('error', 'O\'yin allaqachon yakunlangan');
                return;
            }

            // Server-side Name Resolution: Always trust DB if studentId is provided
            if (studentId) {
                try {
                    const studentRes = await query('SELECT name FROM students WHERE id = $1', [studentId]);
                    if (studentRes.rowCount && studentRes.rowCount > 0) {
                        name = studentRes.rows[0].name;
                        console.log(`[join-game] Resolved name for ${studentId}: ${name}`);
                    }
                } catch (err) {
                    console.error('[join-game] DB name resolution error:', err);
                }
            }

            const playerId = studentId || socket.id;
            const existingPlayer = await store.getPlayer(pin, playerId);

            if (existingPlayer) {
                existingPlayer.socketId = socket.id;
                // If they rejoined, they might have a generic name but now we resolved it
                if (studentId) {
                    existingPlayer.name = name;
                    (socket as any).studentId = studentId; // Persist identity
                }
                
                await store.setPlayer(pin, existingPlayer);
                socket.join(pin);
                socket.emit('joined', { name: existingPlayer.name, playerId });
                if (game.status === 'ACTIVE') {
                    if (game.isUnitQuiz) {
                        let questions = game.quiz.questions;
                        if (typeof questions === 'string') {
                            try { questions = JSON.parse(questions); } catch (e) { questions = []; }
                        }
                        socket.emit('unit-game-started', {
                            questions,
                            title: game.quiz.title,
                            isDuel: (game as any).isDuel,
                            createdAt: (game as any).createdAt
                        });
                    } else {
                        socket.emit('game-started', { title: game.quiz.title });
                    }
                }
                await broadcastPlayerUpdate(io, pin, playerId);
                return;
            }

            if (game.status === 'ACTIVE' && !game.isUnitQuiz) {
                socket.emit('error', 'O\'yin allaqachon boshlangan');
                return;
            }

            if (studentId) (socket as any).studentId = studentId; // Persist identity
            
            const newPlayer = {
                id: playerId,
                socketId: socket.id,
                name,
                score: 0,
                answers: {},
                status: 'joined' as 'joined',
                isFinished: false,
                hp: 100,
                combo: 0,
                lastAnswerTime: Date.now()
            };

            await store.addPlayer(pin, newPlayer);
            socket.join(pin);
            socket.emit('joined', { name, playerId });
            if (game.status === 'ACTIVE') {
                if (game.isUnitQuiz) {
                    let questions = game.quiz.questions;
                    if (typeof questions === 'string') {
                        try { questions = JSON.parse(questions); } catch (e) { questions = []; }
                    }
                    socket.emit('unit-game-started', {
                        questions,
                        title: game.quiz.title,
                        isDuel: (game as any).isDuel,
                        createdAt: (game as any).createdAt
                    });
                } else {
                    socket.emit('game-started', { title: game.quiz.title });
                }
            }
            await broadcastPlayerUpdate(io, pin, playerId);
        });

        socket.on('host-start-game', async (data: any) => {
            const pin = typeof data === 'string' ? data : data.pin;
            const timeLimit = typeof data === 'object' ? (data.timeLimit || data.totalTimeMinutes) : null;

            const game = await store.getGame(pin);
            if (game && game.hostId === socket.id) {
                game.status = 'ACTIVE';
                
                if (game.isUnitQuiz) {
                    if (timeLimit) {
                        (game as any).endTime = Date.now() + (timeLimit * 60 * 1000);
                    }
                    await store.setGame(pin, game);
                    let questions = game.quiz.questions;
                    if (typeof questions === 'string') {
                        try { questions = JSON.parse(questions); } catch (e) { questions = []; }
                    }
                    io.to(pin).emit('unit-game-started', {
                        questions,
                        endTime: (game as any).endTime,
                        title: game.quiz.title,
                        createdAt: (game as any).createdAt
                    });
                } else {
                    game.currentQuestionIndex = 0;
                    await store.setGame(pin, game);
                    io.to(pin).emit('game-started', { title: game.quiz.title });
                    await sendQuestion(io, pin);
                }
            }
        });

        socket.on('next-question', async (pin: string) => {
            const game = await store.getGame(pin);
            if (game && game.hostId === socket.id && game.status === 'ACTIVE') {
               game.currentQuestionIndex++;
               if (game.currentQuestionIndex < game.quiz.questions.length) {
                   await store.setGame(pin, game);
                   await sendQuestion(io, pin);
               } else {
                   await finishGame(io, pin);
               }
            }
        });

        // Student events
        socket.on('player-answer', async ({ pin, answer, questionIndex }: { pin: string, answer: string | number, questionIndex?: number }, callback?: (res: { success: boolean, error?: string }) => void) => {
            const metadata = await store.getGameMetadata(pin);
            if (!metadata || metadata.status !== 'ACTIVE') {
                if (callback) callback({ success: false, error: 'O\'yin faol emas' });
                return;
            }

            const playerId = (socket as any).studentId || socket.id;
            const player = await store.getPlayer(pin, playerId);
            if (!player) {
                if (callback) callback({ success: false, error: 'O\'quvchi topilmadi' });
                return;
            }

            const qIdx = metadata.isUnitQuiz && questionIndex !== undefined ? questionIndex : metadata.currentQuestionIndex;
            if (qIdx === undefined || qIdx < 0 || qIdx >= metadata.quiz!.questions.length) {
                if (callback) callback({ success: false, error: 'Savol noto\'g\'ri' });
                return;
            }

            const question = metadata.quiz!.questions[qIdx];
            if (!(player as any).partialScoreMap) (player as any).partialScoreMap = {};
            const prevPartialScore = (player as any).partialScoreMap[qIdx] || 0;

            let currentScore = 0;
            const textTypes = ['text-input', 'fill-blank', 'find-mistake', 'rewrite', 'word-box', 'matching', 'vocabulary'];
            
            if (question.type === 'matching' || question.type === 'word-box') {
                currentScore = countCorrectParts(String(answer), question.acceptedAnswers || []);
            } else if (textTypes.includes(question.type || '')) {
                if (checkAnswer(String(answer), question.acceptedAnswers || [])) {
                    currentScore = 1;
                }
            } else {
                if (Number(answer) === question.correctIndex) currentScore = 1;
            }

            player.answers[qIdx] = answer;
            player.score = (player.score || 0) - prevPartialScore + currentScore;
            (player as any).partialScoreMap[qIdx] = currentScore;

            await store.setPlayer(pin, player);
            console.log(`[Answer Debug] Player ${player.id} answered Q${qIdx} in pin ${pin}. Answer: ${answer}`);
            if (callback) callback({ success: true });

            if (metadata.isUnitQuiz) {
                console.log(`[Answer Debug] Triggering broadcast for unit quiz ${pin}`);
                await broadcastPlayerUpdate(io, pin, player.id);
            }

            // Duel Arena Mechanics
            if (metadata.isDuel) {
                const now = Date.now();
                const questionStartTime = (metadata as any).startTime || now;
                const timeTaken = (now - questionStartTime) / 1000;
                const totalTime = metadata.timePerQuestion || question.timeLimit || 20;

                let damage = 0;
                let improved = currentScore > prevPartialScore;

                if (improved) {
                    // Damage calculation
                    const baseDamage = 5;
                    const speedBonus = Math.max(0, Math.floor(((totalTime - timeTaken) / totalTime) * 5)); // Up to 5 bonus
                    const comboBonus = (player.combo || 0) * 1; // +1 per combo
                    
                    damage = baseDamage + speedBonus + comboBonus;
                    player.combo = (player.combo || 0) + 1;
                    
                    // Critical Hit (10% chance)
                    if (Math.random() < 0.1) {
                        damage = Math.floor(damage * 1.5);
                        io.to(pin).emit('duel-effect', { type: 'CRITICAL', playerId: player.id });
                    }
                } else if (currentScore < prevPartialScore) {
                    // Player made a mistake or changed a correct answer
                    player.combo = 0;
                    // Optional: no self-damage here to keep it fair during typing
                }

                player.lastAnswerTime = now;
                await store.setPlayer(pin, player);

                // Apply damage to opponent only on IMPROVED score
                if (improved) {
                    const game = await store.getGame(pin);
                    if (game) {
                        const opponent = game.players.find(p => p.id !== player.id);
                        if (opponent) {
                            opponent.hp = Math.max(0, (opponent.hp || 100) - damage);
                            await store.setPlayer(pin, opponent);
                            io.to(pin).emit('duel-damage', { targetId: opponent.id, damage, attackerId: player.id, combo: player.combo });

                            // Check for KO
                            if ((opponent.hp || 0) <= 0) {
                                io.to(pin).emit('duel-ko', { winnerId: player.id, loserId: opponent.id });
                                setTimeout(() => finishGame(io, pin), 2000);
                            }
                        }
                    }
                }

                // Sync HP/Combo to both players
                const gameAfter = await store.getGame(pin);
                const playersSync = gameAfter?.players.map(p => ({
                    id: p.id,
                    hp: p.hp,
                    combo: p.combo,
                    score: p.score
                }));
                io.to(pin).emit('duel-status-sync', playersSync);
            }

            if (textTypes.includes(question.type || '') && currentScore === 0 && answer) {
                enqueueAICheck(io, pin, playerId, qIdx, question.text, String(answer), question.type || 'text-input', question.acceptedAnswers)
                    .catch(e => console.error('[AI-Queue-Error]', e));
            }
        });

        socket.on('student-register', async ({ studentId }: { studentId: string }) => {
            (socket as any).studentId = studentId;
            await store.setSocket(studentId, socket.id);
        });

        socket.on('duel-invite', async ({ targetStudentId, studentName, quizId, quizTitle }: { targetStudentId: string, studentName: string, quizId: string, quizTitle: string }) => {
            const targetSocketId = await store.getSocket(targetStudentId);
            if (targetSocketId) {
                io.to(targetSocketId).emit('duel-invited', { fromId: (socket as any).studentId, fromName: studentName, quizId, quizTitle });
            } else {
                socket.emit('error', 'O\'quvchi hozirda onlayn emas');
            }
        });

        socket.on('duel-accept', async ({ fromId, quizId }: { fromId: string, quizId: string }) => {
            const fromSocketId = await store.getSocket(fromId);
            const studentId = (socket as any).studentId;
            if (!fromSocketId || !studentId) return;

            try {
                const quizRes = await query('SELECT * FROM duel_quizzes WHERE id = $1', [quizId]);
                let quiz;
                if ((quizRes.rowCount || 0) > 0) {
                    quiz = quizRes.rows[0];
                } else {
                    const unitQuizRes = await query('SELECT * FROM unit_quizzes WHERE id = $1', [quizId]);
                    if ((unitQuizRes.rowCount || 0) === 0) return socket.emit('error', 'Test topilmadi');
                    quiz = unitQuizRes.rows[0];
                }

                const duelId = uuidv4();
                await query('INSERT INTO duels (id, player1_id, player2_id, quiz_id, status) VALUES ($1, $2, $3, $4, $5)', [duelId, fromId, studentId, quizId, 'active']);

                const pin = await generatePin();
                const game = {
                    pin,
                    quiz,
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
                console.error('[Duel-Accept] Error starting duel:', err);
                socket.emit('error', 'Duelni boshlashda xatolik');
            }
        });

        socket.on('host-get-status', async (pin: string) => {
            const game = await store.getGame(pin);
            if (!game) {
                socket.emit('error', 'O\'yin topilmadi yoki yakunlangan.');
                return;
            }

            // Allow any socket to claim host role on this PIN if it's not system-hosted
            if (game.hostId !== 'system') {
                game.hostId = socket.id;
                await store.setGame(pin, game);
                socket.join(pin);
            }

            if (game.status === 'LOBBY') {
                // If they refresh in a lobby, make sure they get the PIN back
                socket.emit('game-created', pin);
            }

            if (game.status === 'ACTIVE') {
                if (game.isUnitQuiz) {
                    let questions = game.quiz.questions;
                    if (typeof questions === 'string') {
                        try { questions = JSON.parse(questions); } catch (e) { questions = []; }
                    }
                    socket.emit('unit-game-started', {
                        questions,
                        endTime: (game as any).endTime,
                        title: game.quiz.title,
                        createdAt: (game as any).createdAt
                    });
                } else {
                    socket.emit('game-started', { title: game.quiz.title });

                    let questions = game.quiz.questions;
                    if (typeof questions === 'string') {
                        try { questions = JSON.parse(questions); } catch (e) { questions = []; }
                    }
                    const questionsArr = Array.isArray(questions) ? questions : [];

                    const question = questionsArr[game.currentQuestionIndex];
                    if (question) {
                        socket.emit('question-new', {
                            ...question,
                            timeLimit: game.timePerQuestion || question.timeLimit || 20,
                            questionIndex: game.currentQuestionIndex + 1,
                            totalQuestions: questionsArr.length
                        });
                    }
                }
            }
            await broadcastPlayerUpdate(io, pin);
        });

        socket.on('player-get-status', async ({ pin, studentId }: { pin: string, studentId?: string }) => {
            if (studentId) (socket as any).studentId = studentId; // Persist identity
            
            const game = await store.getGame(pin);
            if (!game) return;

            const pId = studentId || (socket as any).studentId || socket.id;
            const player = await store.getPlayer(pin, pId);
            if (!player) return;

            // Send current game state to player
            if (game.status === 'ACTIVE') {
                if (game.isUnitQuiz) {
                    let questions = game.quiz.questions;
                    if (typeof questions === 'string') {
                        try { questions = JSON.parse(questions); } catch (e) { questions = []; }
                    }
                    socket.emit('unit-game-started', {
                        questions,
                        title: game.quiz.title,
                        isDuel: (game as any).isDuel,
                        createdAt: (game as any).createdAt
                    });
                } else {
                    socket.emit('game-started', { title: game.quiz.title });
                    // If in normal mode, also send the current question if active
                    if (game.currentQuestionIndex >= 0 && game.currentQuestionIndex < game.quiz.questions.length) {
                        const question = game.quiz.questions[game.currentQuestionIndex];
                        const timeLimit = game.timePerQuestion || question.timeLimit || 20;
                        socket.emit('question-start', {
                            info: question.info,
                            questionIndex: game.currentQuestionIndex + 1,
                            timeLimit,
                            type: question.type,
                            text: question.text,
                            options: question.options,
                            startTime: Date.now() // Note: this isn't perfect for sync but better than nothing
                        });
                    }
                }
            } else if (game.status === 'FINISHED') {
                socket.emit('game-over', game.players);
            }
        });

        socket.on('host-end-game', async (pin: string) => {
            const game = await store.getGame(pin);
            if (game && (game.hostId === socket.id || game.hostId === 'system')) {
                await finishGame(io, pin);
            }
        });

        socket.on('unit-player-finish', async ({ pin }: { pin: string }) => {
            const playerId = (socket as any).studentId || socket.id;
            const player = await store.getPlayer(pin, playerId);
            if (player) {
                player.isFinished = true;
                await store.setPlayer(pin, player);
                
                const game = await store.getGame(pin);
                if (game) {
                    // Send results to this player
                    socket.emit('unit-finished', { 
                        score: player.score, 
                    });

                    // --- DUEL: force-finish the opponent too ---
                    if ((game as any).isDuel) {
                        const opponent = game.players.find((p: any) => p.id !== playerId);
                        if (opponent && !opponent.isFinished) {
                            opponent.isFinished = true;
                            await store.setPlayer(pin, opponent);
                            // Notify the opponent that the game has ended
                            const opponentSocketId = await store.getSocket(opponent.id);
                            if (opponentSocketId) {
                                io.to(opponentSocketId).emit('unit-finished', {
                                    score: opponent.score,
                                });
                            }
                        }
                    }

                    // Update host dashboard with FULL state to ensure UI catches it
                    await broadcastPlayerUpdate(io, pin);
                }
            }
        });
        
        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });
}
