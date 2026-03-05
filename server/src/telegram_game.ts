import { Telegraf } from 'telegraf';
import { query } from './db';
import { Question } from './types';
import Bottleneck from 'bottleneck';
import { gameLogger } from './services/logger';
import { SettingsService } from './services/settings';

// Rate limiter for Telegram API: 1 msg per 50ms (20 msg/sec) to stay safe
const limiter = new Bottleneck({
    minTime: 50,
    maxConcurrent: 1
});

import { gameSessions, GameState, PlayerEntry } from './services/sessionManager';

// Remove the local Map
// const activeGames = new Map<string, GameState>();

export function setupTelegramGame(bot: Telegraf) {

    bot.command('start_game', async (ctx) => {
        const chatId = ctx.chat.id.toString();
        // Allow only in groups, or at least don't crash. (optional: check if ctx.chat.type is group or supergroup)
        if (ctx.chat.type === 'private') {
            return ctx.reply("❌ Bu buyruq faqat guruhlarda ishlaydi!");
        }

        // Initialize empty state
        await gameSessions.set(chatId, {
            chatId,
            questions: [],
            currentQIndex: 0,
            players: [],
            status: 'SETUP',
            gameMode: 'SOLO', // Default to solo
            teamScores: { Red: 0, Blue: 0 }
        });

        // Register/Update group chat info
        try {
            await query(`
                INSERT INTO telegram_group_chats (chat_id, title)
                VALUES ($1, $2)
                ON CONFLICT (chat_id) DO UPDATE SET title = $2
            `, [chatId, ctx.chat.title || 'Guruh']);
        } catch (err) {
            console.error('[tg_game] error saving chat info:', err);
        }

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
            gameLogger.error('error fetching levels:', err);
        }
    });

    bot.command('stop_game', async (ctx) => {
        const chatId = ctx.chat.id.toString();
        // Allow only in groups
        if (ctx.chat.type === 'private') {
            return ctx.reply("❌ Bu buyruq faqat guruhlarda ishlaydi!");
        }

        if (!(await gameSessions.has(chatId))) {
            return ctx.reply("❌ Faol o'yin topilmadi.");
        }

        const state = (await gameSessions.get(chatId))!;
        if (state.timer) clearTimeout(state.timer);

        try {
            if (state.status === 'JOINING' && state.players.length > 0) {
                const entryFee = await SettingsService.get('tg_game_entry_fee', 10);
                for (const p of state.players) {
                    await query('UPDATE students SET coins = coins + $1 WHERE id = $2', [entryFee, p.id]).catch(console.error);
                }
            }
            await ctx.reply("⛔ O'yin muddatidan oldin to'xtatildi.", { parse_mode: 'HTML' });
        } catch (e) { }

        await gameSessions.delete(chatId);
    });

    bot.action(/^tg_level_(.+)$/, async (ctx) => {
        const chatId = ctx.chat?.id.toString();
        const level = ctx.match[1];
        if (!chatId || !(await gameSessions.has(chatId))) return ctx.answerCbQuery("❌ O'yin topilmadi, iltimos /start_game ni qayta bosing", { show_alert: true });

        const state = (await gameSessions.get(chatId))!;
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
            gameLogger.error('error fetching quizzes:', err);
            ctx.answerCbQuery('Xatolik');
        }
    });

    bot.action(/^tg_quiz_(.+)$/, async (ctx) => {
        const chatId = ctx.chat?.id.toString();
        const quizId = ctx.match[1];
        if (!chatId || !(await gameSessions.has(chatId))) return ctx.answerCbQuery("O'yin xatosi", { show_alert: true });

        const state = (await gameSessions.get(chatId))!;
        if (state.status !== 'SETUP') return ctx.answerCbQuery();

        try {
            const quizRes = await query('SELECT title, questions FROM unit_quizzes WHERE id = $1', [quizId]);
            if (quizRes.rowCount === 0) return ctx.answerCbQuery("Test topilmadi", { show_alert: true });

            state.quizId = quizId;
            state.quizTitle = quizRes.rows[0].title;
            const allQuestions: Question[] = quizRes.rows[0].questions;
            // Transform questions for Telegram (multiple-choice)
            state.questions = transformToTelegramStyle(allQuestions);

            if (state.questions.length === 0) {
                return ctx.editMessageText("Bu testda Telegram uchun mos (Test yoki Lug'at) savollar yo'q ekan.");
            }

            await ctx.editMessageText(
                `🎉 <b>${state.quizTitle}</b> tanlandi.\n\n` +
                `Qanday formatda o'ynaymiz?`,
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "👤 Solo (Har kim o'zi uchun)", callback_data: "tg_mode_SOLO" }],
                            [{ text: "👥 Team Battle (Jamoaviy)", callback_data: "tg_mode_TEAM" }]
                        ]
                    }
                }
            );
            ctx.answerCbQuery();
        } catch (err) {
            console.error('[tg_game] error starting quiz:', err);
            ctx.answerCbQuery();
        }
    });

    bot.action(/^tg_mode_(SOLO|TEAM)$/, async (ctx) => {
        const chatId = ctx.chat?.id.toString();
        const mode = ctx.match[1] as 'SOLO' | 'TEAM';
        if (!chatId || !(await gameSessions.has(chatId))) return ctx.answerCbQuery("O'yin xatosi");

        const state = (await gameSessions.get(chatId))!;
        if (state.status !== 'SETUP') return ctx.answerCbQuery();

        state.gameMode = mode;
        state.status = 'JOINING';

        const entryFee = await SettingsService.get('tg_game_entry_fee', 10);
        const msg = await ctx.editMessageText(
            `🎉 <b>${state.quizTitle}</b> o'yini ochilyapti!\n` +
            `Format: ${mode === 'SOLO' ? '👤 Solo' : '👥 Team Battle'}\n\n` +
            `⏳ Qatnashish uchun 30 soniya vaqtingiz bor.\n` +
            `💰 Kirish to'lovi: ${entryFee} coin\n\n` +
            `Qatnashuvchilar: 0 ta`,
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "✋ Qatnashish", callback_data: "tg_join" }],
                        [{ text: "⏳ +30 soniya", callback_data: "tg_add_time" }, { text: "❌ Bekor qilish", callback_data: "tg_cancel_game" }]
                    ]
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
    });

    bot.action('tg_join', async (ctx) => {
        const chatId = ctx.chat?.id.toString();
        const userId = ctx.from.id.toString();

        if (!chatId || !(await gameSessions.has(chatId))) return ctx.answerCbQuery("O'yin endi faol emas.", { show_alert: true });

        const state = (await gameSessions.get(chatId))!;
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

            // --- Coin Integration ---
            const entryFee = await SettingsService.get('tg_game_entry_fee', 10);
            const coinRes = await query('SELECT coins FROM students WHERE id = $1', [student.id]);
            const currentCoins = coinRes.rows[0]?.coins || 0;

            if (currentCoins < entryFee) {
                return ctx.answerCbQuery(`❌ O'yinga kirish uchun kamida ${entryFee} coin kerak. Sizda: ${currentCoins}`, { show_alert: true });
            }

            // Deduct coins
            await query('UPDATE students SET coins = coins - $1 WHERE id = $2', [entryFee, student.id]);
            // ------------------------

            // Assign team if in team mode (alternate)
            let team: 'Red' | 'Blue' | undefined;
            if (state.gameMode === 'TEAM') {
                const redCount = state.players.filter((p: PlayerEntry) => p.team === 'Red').length;
                const blueCount = state.players.filter((p: PlayerEntry) => p.team === 'Blue').length;
                team = redCount <= blueCount ? 'Red' : 'Blue';
            }

            state.players.push({
                id: student.id,
                name: student.name,
                score: 0,
                telegramUserId: userId,
                hasAnswered: false,
                streak: 0,
                team
            });

            await gameSessions.set(chatId, state);

            const playerNames = state.players.map((p: PlayerEntry) => {
                const teamIcon = p.team === 'Red' ? '🔴 ' : p.team === 'Blue' ? '🔵 ' : '• ';
                return `${teamIcon}${p.name}`;
            }).join('\n');

            await ctx.editMessageText(
                `🎉 <b>${state.quizTitle}</b> o'yini ochilyapti!\n` +
                `Format: ${state.gameMode === 'SOLO' ? '👤 Solo' : '👥 Team Battle'}\n\n` +
                `⏳ Qatnashish uchun vaqt ketyapti...\n` +
                `💰 Kirish to'lovi: ${entryFee} coin\n\n` +
                `Qatnashuvchilar (${state.players.length}):\n${playerNames}`,
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "✋ Qo'shilish", callback_data: "tg_join" }],
                            [{ text: "⏳ +30 soniya", callback_data: "tg_add_time" }, { text: "❌ Bekor qilish", callback_data: "tg_cancel_game" }]
                        ]
                    }
                }
            );
            ctx.answerCbQuery(`Muvaffaqiyatli qo'shildingiz! ${team ? (team === 'Red' ? '🔴 Jamoasiga' : '🔵 Jamoasiga') : ''} -${entryFee} coin`);

        } catch (err) {
            console.error('[tg_game] join error:', err);
            ctx.answerCbQuery("Xatolik yuz berdi");
        }
    });

    bot.action('tg_add_time', async (ctx) => {
        const chatId = ctx.chat?.id.toString();
        if (!chatId || !(await gameSessions.has(chatId))) return ctx.answerCbQuery("O'yin xatosi", { show_alert: true });

        const state = (await gameSessions.get(chatId))!;
        if (state.status !== 'JOINING') return ctx.answerCbQuery("Buni faqat kutish vaqtida qilish mumkin", { show_alert: true });

        if (state.timer) clearTimeout(state.timer);
        state.timer = setTimeout(() => {
            startGamePlay(bot, chatId);
        }, 30000);

        ctx.answerCbQuery("Vaqt yana 30 soniyaga uzaytirildi!");

        // Optional: Update message to denote more time without overriding the join list mostly
        try {
            const entryFee = await SettingsService.get('tg_game_entry_fee', 10);
            const playerNames = state.players.map((p: PlayerEntry) => {
                const teamIcon = p.team === 'Red' ? '🔴 ' : p.team === 'Blue' ? '🔵 ' : '• ';
                return `${teamIcon}${p.name}`;
            }).join('\n');

            await ctx.editMessageText(
                `🎉 <b>${state.quizTitle}</b> o'yini ochilyapti!\n` +
                `Format: ${state.gameMode === 'SOLO' ? '👤 Solo' : '👥 Team Battle'}\n\n` +
                `⏳ Qatnashish vaqti uzaytirildi (+30s)...\n` +
                `💰 Kirish to'lovi: ${entryFee} coin\n\n` +
                `Qatnashuvchilar (${state.players.length}):\n${playerNames}`,
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "✋ Qo'shilish", callback_data: "tg_join" }],
                            [{ text: "⏳ +30 soniya", callback_data: "tg_add_time" }, { text: "❌ Bekor qilish", callback_data: "tg_cancel_game" }]
                        ]
                    }
                }
            );
        } catch (e) { } // ignore message not modified error
    });

    bot.action('tg_cancel_game', async (ctx) => {
        const chatId = ctx.chat?.id.toString();
        if (!chatId || !(await gameSessions.has(chatId))) return ctx.answerCbQuery("O'yin topilmadi", { show_alert: true });

        const state = (await gameSessions.get(chatId))!;
        if (state.status === 'FINISHED') return ctx.answerCbQuery();

        if (state.timer) clearTimeout(state.timer);

        try {
            // Refund coins if cancelled during JOIN phase
            if (state.status === 'JOINING' && state.players.length > 0) {
                const entryFee = await SettingsService.get('tg_game_entry_fee', 10);
                for (const p of state.players) {
                    await query('UPDATE students SET coins = coins + $1 WHERE id = $2', [entryFee, p.id]).catch(console.error);
                }
            }

            await ctx.editMessageText("⛔ O'yin bekor qilindi.", { parse_mode: 'HTML' });
        } catch (e) { }

        await gameSessions.delete(chatId);
        ctx.answerCbQuery("O'yin bekor qilindi.");
    });

    bot.action(/^tg_ans_(\d+)$/, async (ctx) => {
        const chatId = ctx.chat?.id.toString();
        const userId = ctx.from.id.toString();
        const answerIndex = parseInt(ctx.match[1]);

        if (!chatId || !(await gameSessions.has(chatId))) return ctx.answerCbQuery("O'yin endi faol emas.", { show_alert: true });

        const state = (await gameSessions.get(chatId))!;
        if (state.status !== 'PLAYING') return ctx.answerCbQuery("Ushbu savolning vaqti tugagan.", { show_alert: true });

        const player = state.players.find(p => p.telegramUserId === userId);
        if (!player) return ctx.answerCbQuery("Siz bu o'yinga qo'shilmagansiz.", { show_alert: true });

        if (player.hasAnswered) {
            return ctx.answerCbQuery("Siz javob berib bo'ldingiz!", { show_alert: true });
        }

        player.hasAnswered = true;
        const q = state.questions[state.currentQIndex];

        const isCorrect = answerIndex === q.correctIndex;

        let totalPoints = 0;
        if (isCorrect) {
            // Speed bonus scoring with dynamic multiplier
            const multiplier = await SettingsService.get('tg_reward_multiplier', 1.0);
            const timeTaken = Date.now() - (state.questionStartTime || Date.now());
            const maxPoints = 1000;
            const deduction = Math.min((timeTaken / 30000) * 500, 500);
            totalPoints = Math.round((maxPoints - deduction) * multiplier);
            player.score += totalPoints;
            player.streak++;

            if (player.team) {
                state.teamScores[player.team] += totalPoints;
            }

            if (player.streak >= 3) {
                limiter.schedule(() => bot.telegram.sendMessage(chatId, `🔥 <b>${player.name}</b> ketma-ket ${player.streak} ta to'g'ri javob topdi!`, { parse_mode: 'HTML' })).catch(() => { });
            }
        } else {
            player.streak = 0;
        }

        await gameSessions.set(chatId, state);

        const feedbackMsg = isCorrect ? `✅ To'g'ri! +${totalPoints} XP` : `❌ Noto'g'ri! To'g'ri javob: ${q.options![q.correctIndex]}`;
        ctx.answerCbQuery(feedbackMsg);

        // Check if all players have answered
        if (state.players.every(p => p.hasAnswered)) {
            // Clear the 30s timer and advance immediately
            if (state.timer) clearTimeout(state.timer);
            await moveNext(bot, chatId);
        }
    });

    bot.action('tg_hint', async (ctx) => {
        const chatId = ctx.chat?.id.toString();
        const userId = ctx.from.id.toString();

        if (!chatId || !(await gameSessions.has(chatId))) return ctx.answerCbQuery("O'yin faol emas.");
        const state = (await gameSessions.get(chatId))!;
        if (state.status !== 'PLAYING') return ctx.answerCbQuery("Hozir yordam olish mumkin emas.");

        const player = state.players.find(p => p.telegramUserId === userId);
        if (!player) return ctx.answerCbQuery("Siz o'yinga qo'shilmagansiz.");
        if (player.hasAnswered) return ctx.answerCbQuery("Siz javob berib bo'ldingiz.");

        const q = state.questions[state.currentQIndex];
        if (!q.options || q.options.length < 3) return ctx.answerCbQuery("Bu savolda yordam ishlamaydi.");

        try {
            const hintCost = await SettingsService.get('tg_hint_cost', 5);
            const coinRes = await query('SELECT coins FROM students WHERE id = $1', [player.id]);
            const currentCoins = coinRes.rows[0]?.coins || 0;

            if (currentCoins < hintCost) {
                return ctx.answerCbQuery(`❌ Tangalar yetarli emas! Sizda: ${currentCoins}`, { show_alert: true });
            }

            await query('UPDATE students SET coins = coins - $1 WHERE id = $2', [hintCost, player.id]);

            // Pick 2 wrong indices
            const wrongIndices = q.options
                .map((_, i) => i)
                .filter(i => i !== q.correctIndex)
                .sort(() => 0.5 - Math.random())
                .slice(0, 2);

            const wrongTexts = wrongIndices.map(i => q.options![i]).join(' va ');

            ctx.answerCbQuery(`💡 50/50: "${wrongTexts}" javoblari noto'g'ri!`, { show_alert: true });
        } catch (err) {
            console.error('[tg_game] hint error:', err);
            ctx.answerCbQuery("Xatolik yuz berdi.");
        }
    });
}

// ---------------- Game Loop Functions ----------------

async function startGamePlay(bot: Telegraf, chatId: string) {
    const state = await gameSessions.get(chatId);
    if (!state) return;

    if (state.players.length === 0) {
        state.status = 'FINISHED';
        await gameSessions.delete(chatId);
        try {
            await limiter.schedule(() => bot.telegram.sendMessage(chatId, "❌ Hech kim qo'shilmadi. O'yin bekor qilindi."));
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
                    await limiter.schedule(() => bot.telegram.editMessageText(chatId, msgId, undefined, `Tayyorlaning...\n\n${numbers[i]}`));
                } else {
                    const m = await limiter.schedule(() => bot.telegram.sendMessage(chatId, `Tayyorlaning...\n\n${numbers[i]}`));
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
    const state = await gameSessions.get(chatId);
    if (!state) return;

    // Reset player answers
    state.players.forEach((p: PlayerEntry) => p.hasAnswered = false);

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
        const hintCost = await SettingsService.get('tg_hint_cost', 5);
        // Add Hint button in a separate row
        buttons.push([{ text: `💡 50/50 (-${hintCost} 🪙)`, callback_data: "tg_hint" }]);
    }

    state.questionStartTime = Date.now();
    try {
        const msg = await limiter.schedule(() => bot.telegram.sendMessage(chatId, text, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: buttons }
        }));
        if (typeof msg === 'object' && 'message_id' in msg) {
            state.mainMessageId = msg.message_id;
        }

        // Start 30 second timer for this question
        state.timer = setTimeout(() => {
            moveNext(bot, chatId);
        }, 30000);
    } catch (e) {
        gameLogger.error("Error sending question:", e);
    }
}

async function moveNext(bot: Telegraf, chatId: string) {
    const state = await gameSessions.get(chatId);
    if (!state) return;

    if (state.timer) clearTimeout(state.timer);

    const q = state.questions[state.currentQIndex];

    // Announce correct answer briefly
    let correctText = '';
    if (q.options) correctText = q.options[q.correctIndex];

    let nextText = `Vaqt tugadi ⏳\n\nTo'g'ri javob: <b>${correctText}</b>`;
    if (state.gameMode === 'TEAM') {
        const red = state.teamScores.Red;
        const blue = state.teamScores.Blue;
        nextText += `\n\n🔴 Qizillar: ${red} XP | 🔵 Ko'klar: ${blue} XP`;
    }

    try {
        await limiter.schedule(() => bot.telegram.editMessageText(chatId, state.mainMessageId, undefined,
            nextText, { parse_mode: 'HTML' }
        ));
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
    const state = await gameSessions.get(chatId);
    if (!state) return;

    state.status = 'FINISHED';

    // Sort players by score
    state.players.sort((a: PlayerEntry, b: PlayerEntry) => b.score - a.score);

    let board = `🎉 <b>O'YIN YAKUNLANDI! (${state.quizTitle})</b>\n\n`;

    if (state.gameMode === 'TEAM') {
        const red = state.teamScores.Red;
        const blue = state.teamScores.Blue;
        const winner = red > blue ? '🔴 QIZILLAR' : blue > red ? '🔵 KO\'KLAR' : '🤝 DURANG';
        board += `🏆 <b>G'OLIB: ${winner}</b>\n`;
        board += `📊 Jamoalar: 🔴 ${red} - 🔵 ${blue}\n\n`;
        board += `🏆 <b>SHAXSIY NATIJALAR:</b>\n`;
    } else {
        board += `🏆 <b>NATIJALAR:</b>\n`;
    }

    const playerResultsMap: any[] = [];

    for (let i = 0; i < state.players.length; i++) {
        const p = state.players[i];
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🎀";

        let rewardText = "";
        if (i < 3) {
            const rewards = await SettingsService.get('tg_final_rewards', [50, 30, 10]);
            const multiplier = await SettingsService.get('tg_reward_multiplier', 1.0);
            const reward = Math.round((rewards[i] || 0) * multiplier);
            rewardText = ` (+${reward} 🪙)`;
            try {
                await query('UPDATE students SET coins = coins + $1 WHERE id = $2', [reward, p.id]);
            } catch (e) {
                gameLogger.error(`Error giving reward to ${p.name}:`, e);
            }
        }

        board += `${medal} ${p.name} — ${p.score} XP${rewardText}\n`;
        playerResultsMap.push({
            id: p.id,
            name: p.name,
            score: p.score
        });
    }

    try {
        await limiter.schedule(() => bot.telegram.sendMessage(chatId, board, { parse_mode: 'HTML' }));
        // Send a celebratory sticker from settings
        const stickers = await SettingsService.get('tg_game_stickers', ['CAACAgIAAxkBAAELzxhlyO-Yw-', 'CAACAgIAAxkBAAELzxplyO-mRQ']);
        const randomSticker = stickers[Math.floor(Math.random() * stickers.length)];
        await limiter.schedule(() => bot.telegram.sendSticker(chatId, randomSticker)).catch(() => { });

        // Game results are no longer saved to history per user request.
        // Rewards (coins) were already processed above.

    } catch (err) {
        gameLogger.error('Finish game error:', err);
    }

    await gameSessions.delete(chatId);
}

// ---------------- Helper Functions ----------------

/**
 * Transforms various question types into a format Telegram supports (multiple choice buttons).
 * Specifically converts 'text-input' (vocabulary) into multiple choice by picking incorrect options from the same set.
 */
function transformToTelegramStyle(questions: Question[]): Question[] {
    const validTypes = ['text-input', 'multiple-choice', 'true-false', 'fill-blank'];
    const pool = questions.filter(q => validTypes.includes(q.type || 'multiple-choice'));

    // Cache of all possible accepted answers to use as distractors for text-input / fill-blank
    const allAnswers = pool.flatMap(q => q.acceptedAnswers || q.options || []);

    return pool.map((q) => {
        if (q.type === 'multiple-choice' && q.options && q.options.length > 0) {
            return q;
        }

        if (q.type === 'true-false') {
            return {
                ...q,
                type: 'multiple-choice',
                options: ['True / Rost', 'False / Yolg\'on'],
                correctIndex: q.correctIndex || 0
            };
        }

        if ((q.type === 'text-input' || q.type === 'fill-blank') && q.acceptedAnswers && q.acceptedAnswers.length > 0) {
            const correct = q.acceptedAnswers[0];

            let wrongPool = allAnswers.filter(item => item && item !== correct);

            // If not enough unique wrong options from the quiz, add some generic fillers
            if (new Set(wrongPool).size < 3) {
                wrongPool.push('is', 'are', 'do', 'does', 'have', 'has', 'in', 'on', 'at', 'olma', 'kitob', 'ruchka', 'daftar', 'maktab');
            }

            // Unique and shuffle
            wrongPool = Array.from(new Set(wrongPool)).sort(() => 0.5 - Math.random());

            // Pick 3 wrong options
            const options = [correct, ...wrongPool.slice(0, 3)].sort(() => 0.5 - Math.random());

            return {
                ...q,
                type: 'multiple-choice',
                options,
                correctIndex: options.indexOf(correct)
            } as Question;
        }

        return null;
    }).filter((q): q is Question => q !== null && q.options !== undefined && q.options.length > 1);
}

/**
 * Sends a weekly leaderboard for active group chats based on game_results.
 */
export async function sendGroupWeeklyLeaderboard(bot: Telegraf) {
    try {
        console.log('[tg_game] Starting group weekly leaderboards...');
        const chats = await query('SELECT chat_id, title FROM telegram_group_chats');

        for (const chat of chats.rows) {
            try {
                // Find top 5 players in this group for the last 7 days
                // Since telegram group doesn't have a direct 'group_id' in students easily,
                // we aggregate from game_results that was posted to this specific telegram chat if we had the log.
                // However, game_results is stored with a student's group_id. 
                // A better way: Aggregate scores from game_results where the quiz was potentially played in this chat.
                // For now, let's use the game_results (Telegram games have Quiz Title starting with "[Telegram]")

                const leaderboardRes = await query(`
                    SELECT 
                        p->>'name' as name, 
                        SUM((p->>'score')::int) as total_xp
                    FROM game_results gr
                    CROSS JOIN jsonb_array_elements(gr.player_results) p
                    WHERE gr.created_at >= NOW() - INTERVAL '7 days'
                      AND gr.quiz_title LIKE '[Telegram]%'
                      AND gr.group_id IN (
                          SELECT group_id FROM students s 
                          JOIN student_telegram_subscriptions sub ON s.id = sub.student_id
                          -- This is a bit complex, but let's just use ALL telegram game results for simplicity
                          -- or assume one bot = one main use case.
                      )
                    GROUP BY p->>'name'
                    ORDER BY total_xp DESC
                    LIMIT 5
                `);

                if (leaderboardRes.rowCount === 0) continue;

                let msg = `🏆 <b>GURUH REYTINGI (HAFTALIK)</b>\n`;
                msg += `<i>${chat.title}</i>\n\n`;

                leaderboardRes.rows.forEach((r: any, i: number) => {
                    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🎀";
                    msg += `${medal} <b>${r.name}</b> — ${r.total_xp} XP\n`;
                });

                msg += `\nKelasi haftada omad yor bo'lsin! 🚀`;

                await limiter.schedule(() => bot.telegram.sendMessage(chat.chat_id, msg, { parse_mode: 'HTML' }));
            } catch (e) {
                console.error(`Error sending leaderboard to chat ${chat.chat_id}:`, e);
            }
        }
    } catch (err) {
        console.error('[tg_game] sendGroupWeeklyLeaderboard error:', err);
    }
}
