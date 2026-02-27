import { Telegraf } from 'telegraf';
import { query } from './db';
import { Question } from './types';

interface PlayerEntry {
    id: string;           // Student ID from DB
    name: string;        // Student Name
    score: number;       // Accumulated XP
    telegramUserId: string; // Telegram user who clicked join
    hasAnswered: boolean; // Tracking if they answered current question
}

interface GameState {
    chatId: string;
    level?: string;
    quizId?: string;
    quizTitle?: string;
    questions: Question[];
    currentQIndex: number;
    players: PlayerEntry[];
    status: 'SETUP' | 'JOINING' | 'PLAYING' | 'FINISHED';
    mainMessageId?: number; // The message we edit to avoid spam
    timer?: NodeJS.Timeout;
    questionStartTime?: number;
}

const activeGames = new Map<string, GameState>();

export function setupTelegramGame(bot: Telegraf) {

    bot.command('start_game', async (ctx) => {
        const chatId = ctx.chat.id.toString();
        // Allow only in groups, or at least don't crash. (optional: check if ctx.chat.type is group or supergroup)
        if (ctx.chat.type === 'private') {
            return ctx.reply("❌ Bu buyruq faqat guruhlarda ishlaydi!");
        }

        // Initialize empty state
        activeGames.set(chatId, {
            chatId,
            questions: [],
            currentQIndex: 0,
            players: [],
            status: 'SETUP'
        });

        try {
            // Fetch available levels
            const result = await query('SELECT DISTINCT level FROM unit_quizzes ORDER BY level');
            if (result.rowCount === 0) {
                return ctx.reply("❌ Hech qanday test (daraja) topilmadi.");
            }

            const buttons = result.rows.map(row => [{
                text: row.level,
                callback_data: `tg_level_${row.level}`
            }]);

            await ctx.reply("🎮 <b>Ziyokor Education - Guruh O'yini</b>\n\nQaysi darajadagi testni boshlamoqchisiz?", {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: buttons }
            });
        } catch (err) {
            console.error('[tg_game] error fetching levels:', err);
        }
    });

    bot.action(/^tg_level_(.+)$/, async (ctx) => {
        const chatId = ctx.chat?.id.toString();
        const level = ctx.match[1];
        if (!chatId || !activeGames.has(chatId)) return ctx.answerCbQuery("❌ O'yin topilmadi, iltimos /start_game ni qayta bosing", { show_alert: true });

        const state = activeGames.get(chatId)!;
        if (state.status !== 'SETUP') return ctx.answerCbQuery();

        try {
            state.level = level;
            const quizzesRes = await query('SELECT id, title, unit FROM unit_quizzes WHERE level = $1 ORDER BY unit', [level]);
            if (quizzesRes.rowCount === 0) {
                return ctx.answerCbQuery("Bu darajada testlar yo'q.", { show_alert: true });
            }

            const buttons = quizzesRes.rows.map(row => [{
                text: `${row.unit} - ${row.title}`,
                callback_data: `tg_quiz_${row.id}`
            }]);

            await ctx.editMessageText(`Siz <b>${level}</b> darajasini tanladingiz.\n\nQaysi testni o'ynaymiz?`, {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: buttons }
            });
            ctx.answerCbQuery();
        } catch (err) {
            console.error('[tg_game] error fetching quizzes:', err);
            ctx.answerCbQuery('Xatolik');
        }
    });

    bot.action(/^tg_quiz_(.+)$/, async (ctx) => {
        const chatId = ctx.chat?.id.toString();
        const quizId = ctx.match[1];
        if (!chatId || !activeGames.has(chatId)) return ctx.answerCbQuery("O'yin xatosi", { show_alert: true });

        const state = activeGames.get(chatId)!;
        if (state.status !== 'SETUP') return ctx.answerCbQuery();

        try {
            const quizRes = await query('SELECT title, questions FROM unit_quizzes WHERE id = $1', [quizId]);
            if (quizRes.rowCount === 0) return ctx.answerCbQuery("Test topilmadi", { show_alert: true });

            state.quizId = quizId;
            state.quizTitle = quizRes.rows[0].title;
            // Only use supported question types (e.g. multiple-choice) filtering to make it playable inline
            const allQuestions: Question[] = quizRes.rows[0].questions;
            state.questions = allQuestions.filter(q => q.type === 'multiple-choice');

            if (state.questions.length === 0) {
                return ctx.editMessageText("Bu testda Telegram uchun mos (Test shaklidagi) savollar yo'q ekan.");
            }

            state.status = 'JOINING';
            const msg = await ctx.editMessageText(
                `🎉 <b>${state.quizTitle}</b> o'yini ochilyapti!\n\n` +
                `⏳ Qatnashish uchun 30 soniya vaqtingiz bor.\n\n` +
                `Qatnashuvchilar: 0 ta`,
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [[{ text: "✋ Qatnashish", callback_data: "tg_join" }]]
                    }
                }
            );

            if (typeof msg === 'object' && 'message_id' in msg) {
                state.mainMessageId = msg.message_id;
            }

            // Start 30 second join timer
            state.timer = setTimeout(() => {
                startGamePlay(bot, chatId);
            }, 30000);

            ctx.answerCbQuery();
        } catch (err) {
            console.error('[tg_game] error starting quiz:', err);
            ctx.answerCbQuery();
        }
    });

    bot.action('tg_join', async (ctx) => {
        const chatId = ctx.chat?.id.toString();
        const userId = ctx.from.id.toString();

        if (!chatId || !activeGames.has(chatId)) return ctx.answerCbQuery("O'yin endi faol emas.", { show_alert: true });

        const state = activeGames.get(chatId)!;
        if (state.status !== 'JOINING') return ctx.answerCbQuery("Qo'shilish yakunlangan.", { show_alert: true });

        if (state.players.find(p => p.telegramUserId === userId)) {
            return ctx.answerCbQuery("Siz allaqachon qo'shilgansiz!");
        }

        try {
            // Find student linked to this telegram User ID
            const subRes = await query(`
                SELECT s.id, s.name 
                FROM student_telegram_subscriptions sub
                JOIN students s ON sub.student_id = s.id
                WHERE sub.telegram_chat_id = $1
            `, [userId]);

            if (subRes.rowCount === 0) {
                return ctx.answerCbQuery("Siz botga o'quvchi sifatida ulanmagansiz! Botga kirib 7-xonali kodingizni kiriting.", { show_alert: true });
            }

            // Assume first student if multiple connected (simplification for game)
            const student = subRes.rows[0];

            state.players.push({
                id: student.id,
                name: student.name,
                score: 0,
                telegramUserId: userId,
                hasAnswered: false
            });

            const playerNames = state.players.map(p => `• ${p.name}`).join('\n');

            await ctx.editMessageText(
                `🎉 <b>${state.quizTitle}</b> o'yini ochilyapti!\n\n` +
                `⏳ Qatnashish uchun vaqt ketyapti...\n\n` +
                `Qatnashuvchilar (${state.players.length}):\n${playerNames}`,
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [[{ text: "✋ Qo'shilish", callback_data: "tg_join" }]]
                    }
                }
            );
            ctx.answerCbQuery("Muvaffaqiyatli qo'shildingiz!");

        } catch (err) {
            console.error('[tg_game] join error:', err);
            ctx.answerCbQuery("Xatolik yuz berdi");
        }
    });

    bot.action(/^tg_ans_(\d+)$/, async (ctx) => {
        const chatId = ctx.chat?.id.toString();
        const userId = ctx.from.id.toString();
        const answerIndex = parseInt(ctx.match[1]);

        if (!chatId || !activeGames.has(chatId)) return ctx.answerCbQuery("O'yin endi faol emas.", { show_alert: true });

        const state = activeGames.get(chatId)!;
        if (state.status !== 'PLAYING') return ctx.answerCbQuery("Ushbu savolning vaqti tugagan.", { show_alert: true });

        const player = state.players.find(p => p.telegramUserId === userId);
        if (!player) return ctx.answerCbQuery("Siz bu o'yinga qo'shilmagansiz.", { show_alert: true });

        if (player.hasAnswered) {
            return ctx.answerCbQuery("Siz javob berib bo'ldingiz!", { show_alert: true });
        }

        player.hasAnswered = true;
        const q = state.questions[state.currentQIndex];

        let isCorrect = false;
        if (q.options) {
            // multiple-choice index check
            isCorrect = answerIndex === q.correctIndex;
        } else if (q.type === 'true-false') {
            // Not supporting other types directly via buttons yet, but easy to expand
            isCorrect = answerIndex === q.correctIndex;
        }

        if (isCorrect) {
            // Speed bonus scoring
            const timeTaken = Date.now() - (state.questionStartTime || Date.now());
            const maxPoints = 1000;
            const deduction = Math.min((timeTaken / 30000) * 500, 500); // lose up to 500pts based on time
            player.score += Math.round(maxPoints - deduction);
        }

        ctx.answerCbQuery("Javobingiz qabul qilindi!");

        // Check if all players have answered
        if (state.players.every(p => p.hasAnswered)) {
            // Clear the 30s timer and advance immediately
            if (state.timer) clearTimeout(state.timer);
            await moveNext(bot, chatId);
        }
    });
}

// ---------------- Game Loop Functions ----------------

async function startGamePlay(bot: Telegraf, chatId: string) {
    const state = activeGames.get(chatId);
    if (!state) return;

    if (state.players.length === 0) {
        state.status = 'FINISHED';
        activeGames.delete(chatId);
        try {
            await bot.telegram.sendMessage(chatId, "❌ Hech kim qo'shilmadi. O'yin bekor qilindi.");
        } catch (e) { }
        return;
    }

    state.status = 'PLAYING';
    state.currentQIndex = 0;

    await sendCountdown(bot, chatId, state.mainMessageId, () => {
        sendCurrentQuestion(bot, chatId);
    });
}

async function sendCountdown(bot: Telegraf, chatId: string, msgId: number | undefined, callback: () => void) {
    const numbers = ["3️⃣", "2️⃣", "1️⃣", "🚀 BOSHIDIK!"];
    let i = 0;

    const tick = async () => {
        if (i < numbers.length) {
            try {
                if (msgId) {
                    await bot.telegram.editMessageText(chatId, msgId, undefined, `Tayyorlaning...\n\n${numbers[i]}`);
                } else {
                    const m = await bot.telegram.sendMessage(chatId, `Tayyorlaning...\n\n${numbers[i]}`);
                    msgId = m.message_id;
                }
            } catch (e) { } // ignore message not modified errors
            i++;
            setTimeout(tick, 1000);
        } else {
            callback();
        }
    }
    tick();
}

async function sendCurrentQuestion(bot: Telegraf, chatId: string) {
    const state = activeGames.get(chatId);
    if (!state) return;

    // Reset player answers
    state.players.forEach(p => p.hasAnswered = false);

    const q = state.questions[state.currentQIndex];
    let text = `<b>Savol ${state.currentQIndex + 1} / ${state.questions.length}</b>\n\n`;
    text += `${q.text}\n`;

    const buttons: any[][] = [];
    if (q.options) {
        // Layout buttons in 2x2 grid if 4 options
        for (let i = 0; i < q.options.length; i += 2) {
            const row = [];
            row.push({ text: q.options[i], callback_data: `tg_ans_${i}` });
            if (i + 1 < q.options.length) {
                row.push({ text: q.options[i + 1], callback_data: `tg_ans_${i + 1}` });
            }
            buttons.push(row);
        }
    }

    state.questionStartTime = Date.now();
    try {
        const msg = await bot.telegram.sendMessage(chatId, text, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: buttons }
        });
        if (typeof msg === 'object' && 'message_id' in msg) {
            state.mainMessageId = msg.message_id;
        }

        // Start 30 second timer for this question
        state.timer = setTimeout(() => {
            moveNext(bot, chatId);
        }, 30000);
    } catch (e) {
        console.error("Error sending question:", e);
    }
}

async function moveNext(bot: Telegraf, chatId: string) {
    const state = activeGames.get(chatId);
    if (!state) return;

    if (state.timer) clearTimeout(state.timer);

    const q = state.questions[state.currentQIndex];

    // Announce correct answer briefly
    let correctText = '';
    if (q.options) correctText = q.options[q.correctIndex];

    try {
        await bot.telegram.editMessageText(chatId, state.mainMessageId, undefined,
            `Vaqt tugadi ⏳\n\nTo'g'ri javob: <b>${correctText}</b>`, { parse_mode: 'HTML' }
        );
    } catch (e) { }

    setTimeout(async () => {
        state.currentQIndex++;
        if (state.currentQIndex >= state.questions.length) {
            await finishGame(bot, chatId);
        } else {
            await sendCurrentQuestion(bot, chatId);
        }
    }, 2000); // pause 2s before next question
}

async function finishGame(bot: Telegraf, chatId: string) {
    const state = activeGames.get(chatId);
    if (!state) return;

    state.status = 'FINISHED';

    // Sort players by score
    state.players.sort((a, b) => b.score - a.score);

    let board = `🎉 <b>O'YIN YAKUNLANDI! (${state.quizTitle})</b>\n\n`;
    board += `🏆 <b>NATIJALAR:</b>\n`;

    const playerResultsMap: any[] = [];

    state.players.forEach((p, i) => {
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🎀";
        board += `${medal} ${p.name} — ${p.score} XP\n`;
        playerResultsMap.push({
            id: p.id,
            name: p.name,
            score: p.score
        });
    });

    try {
        await bot.telegram.sendMessage(chatId, board, { parse_mode: 'HTML' });

        // Save to Database (into history)
        // Note: For game_results we normally need a group_id. We'll use a placeholder or deduce it
        // A simple query to get the group_id of the first player to attribute the result
        let groupId = null;
        if (state.players.length > 0) {
            const grpRes = await query('SELECT group_id FROM students WHERE id = $1', [state.players[0].id]);
            if (grpRes.rowCount && grpRes.rowCount > 0) groupId = grpRes.rows[0].group_id;
        }

        if (groupId) {
            // Check if game_results has a UUID column for ID, we can generate a random one here or postgres default
            // By schema: `id UUID PRIMARY KEY`, we need to generate one
            const crypto = require('crypto');
            const newId = crypto.randomUUID();

            await query(`
                INSERT INTO game_results (id, group_id, quiz_title, total_questions, player_results)
                VALUES ($1, $2, $3, $4, $5)
            `, [
                newId,
                groupId,
                `[Telegram] ${state.quizTitle}`,
                state.questions.length,
                JSON.stringify(playerResultsMap)
            ]);
            console.log(`[tg_game] Saved game result ${newId} for group ${groupId}`);
        }

    } catch (err) {
        console.error('[tg_game] Finish game error:', err);
    }

    activeGames.delete(chatId);
}
