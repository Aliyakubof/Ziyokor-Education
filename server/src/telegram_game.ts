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

    // --- Inline PvP Mode (Duel) ---
    bot.on('inline_query', async (ctx) => {
        try {
            const userId = ctx.from.id.toString();
            const q = ctx.inlineQuery.query.trim().toLowerCase();

            // Check if user is linked to a student
            const subRes = await query('SELECT student_id FROM student_telegram_subscriptions WHERE telegram_chat_id = $1 LIMIT 1', [userId]);
            if (subRes.rowCount === 0) {
                return ctx.answerInlineQuery([], {
                    button: { text: "Oldin botdan ro'yxatdan o'ting!", start_parameter: "login" }
                });
            }

            // We only show one "Random Duel" option now that unit quizzes are removed
            const results = [{
                type: 'article',
                id: `duel_custom_random`,
                title: `⚔️ Tasodifiy Duel`,
                description: `Maxsus savollar orqali do'stingiz bilan bellashing!`,
                input_message_content: {
                    message_text: `⚔️ <b>Ziyokor Bot</b>: Yangi DUEL!\n\nMen seni maxsus savollar bo'yicha duelga chorlayman! Qani kim kuchliroq ekan ko'ramiz!`,
                    parse_mode: 'HTML'
                },
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "⚔️ Duelga Qo'shilish", callback_data: `tg_duel_join_custom` }]
                    ]
                }
            }];

            await ctx.answerInlineQuery(results as any, { cache_time: 5 });
        } catch (err) {
            console.error('[tg_game] inline_query error:', err);
        }
    });

    bot.action(/^tg_duel_join_(.+)$/, async (ctx) => {
        const quizId = ctx.match[1];
        const userId = ctx.from.id.toString();
        // For inline keyboards attached to inline messages, ctx.inlineMessageId is present
        const inlineMsgId = ctx.inlineMessageId;

        if (!inlineMsgId) return ctx.answerCbQuery("Bu tugma faqat shaxsiy yozishmalarda (Inline) ishlaydi.", { show_alert: true });

        // Initialize state if not exists
        let state = await gameSessions.get(inlineMsgId);
        if (!state) {
            state = {
                chatId: inlineMsgId,
                questions: [],
                currentQIndex: 0,
                players: [],
                status: 'JOINING',
                gameMode: 'SOLO',
                teamScores: { Red: 0, Blue: 0 },
                totalCoinPool: 0,
                quizId: 'custom_duel'
            };

            // Fetch random custom questions
            const quizRes = await query('SELECT * FROM telegram_questions ORDER BY RANDOM() LIMIT 5');
            if (quizRes && quizRes.rowCount && quizRes.rowCount > 0) {
                state.quizTitle = "Maxsus Duel ✨";
                state.questions = quizRes.rows.map(r => ({
                    text: r.text,
                    options: r.options,
                    correctIndex: r.correct_index,
                    type: 'multiple-choice'
                } as any));
            }
        }

        if (state.status !== 'JOINING') {
            return ctx.answerCbQuery("O'yin allaqachon boshlangan yoki tugagan!", { show_alert: true });
        }

        if (state.players.length >= 2) {
            return ctx.answerCbQuery("Duelda joy yo'q (Max 2 kishi)!", { show_alert: true });
        }

        if (state.players.find(p => p.telegramUserId === userId)) {
            return ctx.answerCbQuery("Siz allaqachon qo'shilgansiz! Do'stingizni qutiyapmiz...");
        }

        try {
            const subRes = await query(`
                SELECT s.id, s.name, s.coins 
                FROM student_telegram_subscriptions sub
                JOIN students s ON sub.student_id = s.id
                WHERE sub.telegram_chat_id = $1 LIMIT 1
            `, [userId]);

            if (subRes.rowCount === 0) return ctx.answerCbQuery("Botdan ro'yxatdan o'tmagansiz!", { show_alert: true });
            const student = subRes.rows[0];

            const entryFee = await SettingsService.get('tg_game_entry_fee', 10);
            if (student.coins < entryFee) return ctx.answerCbQuery(`Sizda yetarli coin yo'q! (Kerak: ${entryFee})`, { show_alert: true });

            // Deduct
            await query('UPDATE students SET coins = coins - $1 WHERE id = $2', [entryFee, student.id]);
            state.totalCoinPool = (state.totalCoinPool || 0) + entryFee;

            state.players.push({
                id: student.id,
                name: student.name,
                score: 0,
                telegramUserId: userId,
                hasAnswered: false,
                streak: 0
            });

            await gameSessions.set(inlineMsgId, state);

            let txt = `⚔️ <b>${state.quizTitle}</b> bo'yicha DUEL!\n\n`;
            state.players.forEach(p => txt += `🥊 ${p.name} (-${entryFee} 🪙)\n`);

            if (state.players.length === 2) {
                txt += `\n🚀 Barcha tayyor! O'yin boshlanmoqda...`;
                // Start PvP
                state.status = 'PLAYING';
                state.currentQIndex = 0;
                await gameSessions.set(inlineMsgId, state);
                await sendDuelQuestion(bot, inlineMsgId);
            } else {
                txt += `\n\n⏳ Ikkinchi ishtirokchini kutmoqdamiz...`;
                await ctx.editMessageText(txt, {
                    parse_mode: 'HTML',
                    reply_markup: { inline_keyboard: [[{ text: "⚔️ Qo'shilish", callback_data: `tg_duel_join_${quizId}` }]] }
                }).catch(() => { });
            }
            ctx.answerCbQuery("Qo'shildingiz!");
        } catch (err) {
            console.error(err);
        }
    });

    bot.action(/^tg_duel_ans_(\d+)$/, async (ctx) => {
        const answerIndex = parseInt(ctx.match[1]);
        const userId = ctx.from.id.toString();
        const inlineMsgId = ctx.inlineMessageId;

        if (!inlineMsgId) return ctx.answerCbQuery();
        const state = await gameSessions.get(inlineMsgId);
        if (!state) return ctx.answerCbQuery("O'yin yakunlangan.");
        if (state.status !== 'PLAYING') return ctx.answerCbQuery("O'yin yakunlangan.");

        const player = state.players.find(p => p.telegramUserId === userId);
        if (!player) return ctx.answerCbQuery("Siz bu duelda emassiz!");
        if (player.hasAnswered) return ctx.answerCbQuery("Siz bu savolga javob berib bo'ldingiz!");

        player.hasAnswered = true;
        const q = state.questions[state.currentQIndex];
        const isCorrect = answerIndex === q.correctIndex;

        let totalPoints = 0;
        if (isCorrect) {
            totalPoints = 1;
            // Speed Bonus for Duels
            const now = Date.now();
            const timeTaken = now - (state.questionStartTime || now);
            if (timeTaken <= 3000) {
                totalPoints += 1;
            }
            player.score += totalPoints;
        }

        await gameSessions.set(inlineMsgId, state);
        ctx.answerCbQuery(isCorrect ? (totalPoints > 1 ? "⚡ Tezkor va To'g'ri! +2 ball" : "✅ To'g'ri!") : "❌ Xato!");

        if (state.players.every(p => p.hasAnswered)) {
            if (state.timer) clearTimeout(state.timer);
            await moveNextDuel(bot, inlineMsgId);
        } else {
            // Update inline message to show who answered
            let txt = `<b>Savol ${state.currentQIndex + 1} / ${state.questions.length}</b>\n\n${q.text}\n\n`;
            state.players.forEach(p => {
                txt += `${p.hasAnswered ? '✅' : '⏳'} ${p.name}\n`;
            });

            // Keep the buttons for the other player
            const buttons: any[][] = [];
            if (q.options) {
                for (let i = 0; i < q.options.length; i += 2) {
                    const row = [];
                    row.push({ text: q.options[i], callback_data: `tg_duel_ans_${i}` });
                    if (i + 1 < q.options.length) {
                        row.push({ text: q.options[i + 1], callback_data: `tg_duel_ans_${i + 1}` });
                    }
                    buttons.push(row);
                }
            }

        }
    });

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
            const result = await query('SELECT * FROM telegram_questions ORDER BY RANDOM() LIMIT 20');
            if (result.rowCount === 0) {
                return ctx.reply("❌ Hozircha maxsus savollar yo'q. Iltimos, Admin panel orqali savollar qo'shing.");
            }

            const state = (await gameSessions.get(chatId))!;
            state.quizId = 'custom';
            state.quizTitle = "Maxsus Savollar ✨";
            state.questions = result.rows.map(r => ({
                text: r.text,
                options: r.options,
                correctIndex: r.correct_index,
                type: 'multiple-choice'
            } as any));

            await ctx.reply(
                `🎮 <b>Ziyokor Education - Guruh O'yini</b>\n\n` +
                `🎉 <b>${state.quizTitle}</b> yuklandi (${state.questions.length} ta savol).\n\n` +
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
        } catch (err) {
            console.error('[tg_game] error loading questions in start_game:', err);
            ctx.reply("❌ Xatolik yuz berdi.");
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

    bot.action(/^tg_mode_(SOLO|TEAM)$/, async (ctx) => {
        const chatId = ctx.chat?.id.toString();
        const mode = ctx.match[1] as 'SOLO' | 'TEAM';
        if (!chatId || !(await gameSessions.has(chatId))) return ctx.answerCbQuery("O'yin xatosi");

        const state = (await gameSessions.get(chatId))!;
        if (state.status !== 'SETUP') return ctx.answerCbQuery();

        state.gameMode = mode;
        state.status = 'JOINING';
        state.joinSecondsLeft = 30;

        const entryFee = await SettingsService.get('tg_game_entry_fee', 10);
        const renderJoinMsg = (seconds: number) => {
            const playerNames = state.players.map((p: PlayerEntry) => {
                const teamIcon = p.team === 'Red' ? '🔴 ' : p.team === 'Blue' ? '🔵 ' : '• ';
                return `${teamIcon}${p.name}`;
            }).join('\n');

            return `🎉 <b>${state.quizTitle}</b> o'yini ochilyapti!\n` +
                `Format: ${state.gameMode === 'SOLO' ? '👤 Solo' : '👥 Team Battle'}\n\n` +
                `⏳ Qatnashish uchun <b>${seconds}</b> soniya qoldi!\n` +
                `💰 Kirish to'lovi: ${entryFee} coin\n\n` +
                `Qatnashuvchilar (${state.players.length}):\n${playerNames || '<i>Hali hech kim yo\'q</i>'}`;
        };

        const msg = await ctx.editMessageText(renderJoinMsg(30), {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "✋ Qatnashish", callback_data: "tg_join" }],
                    [{ text: "⏳ +30 soniya", callback_data: "tg_add_time" }, { text: "❌ Bekor qilish", callback_data: "tg_cancel_game" }]
                ]
            }
        });

        if (typeof msg === 'object' && 'message_id' in msg) {
            state.mainMessageId = msg.message_id;
        }

        // Animated join timer without editing telegram message every second
        state.joinTimerInterval = setInterval(async () => {
            if (state.joinSecondsLeft && state.joinSecondsLeft > 0) {
                state.joinSecondsLeft -= 1;

                if (state.joinSecondsLeft <= 0) {
                    clearInterval(state.joinTimerInterval);
                    startGamePlay(bot, chatId);
                    return;
                }
            }
        }, 1000);

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
            const publicMode = await SettingsService.get('tg_game_all_can_join', false);
            const entryFee = await SettingsService.get('tg_game_entry_fee', 10);

            // Find student linked to this telegram User ID
            const subRes = await query(`
                SELECT s.id, s.name, s.coins 
                FROM student_telegram_subscriptions sub
                JOIN students s ON sub.student_id = s.id
                WHERE sub.telegram_chat_id = $1
            `, [userId]);

            let playerEntry: PlayerEntry;

            if (subRes.rowCount === 0) {
                if (!publicMode) {
                    return ctx.answerCbQuery("Siz botga o'quvchi sifatida ulanmagansiz! Botga kirib 7-xonali kodingizni kiriting.", { show_alert: true });
                }
                playerEntry = {
                    id: `unreg_${userId}`,
                    name: ctx.from.first_name || 'Ishtirokchi',
                    score: 0,
                    telegramUserId: userId,
                    hasAnswered: false,
                    streak: 0,
                    isUnregistered: true
                };
            } else {
                const student = subRes.rows[0];
                if (student.coins < entryFee) {
                    return ctx.answerCbQuery(`❌ O'yinga kirish uchun kamida ${entryFee} coin kerak. Sizda: ${student.coins}`, { show_alert: true });
                }

                // Deduct coins
                await query('UPDATE students SET coins = coins - $1 WHERE id = $2', [entryFee, student.id]);
                state.totalCoinPool = (state.totalCoinPool || 0) + entryFee;

                playerEntry = {
                    id: student.id,
                    name: student.name,
                    score: 0,
                    telegramUserId: userId,
                    hasAnswered: false,
                    streak: 0
                };
            }

            // Assign team if in team mode (alternate)
            if (state.gameMode === 'TEAM') {
                const redCount = state.players.filter(p => p.team === 'Red').length;
                const blueCount = state.players.filter(p => p.team === 'Blue').length;
                playerEntry.team = redCount <= blueCount ? 'Red' : 'Blue';
            }

            state.players.push(playerEntry);
            await gameSessions.set(chatId, state);

            await updateJoinMessage(ctx, state, entryFee);
            ctx.answerCbQuery(`Muvaffaqiyatli qo'shildingiz! ${playerEntry.team ? (playerEntry.team === 'Red' ? '🔴 Jamoasiga' : '🔵 Jamoasiga') : ''} ${playerEntry.isUnregistered ? '(Mehmon)' : `-${entryFee} coin`}`);

        } catch (err) {
            console.error('[tg_game] join error:', err);
            ctx.answerCbQuery("Xatolik yuz berdi");
        }
    });

    /**
     * Helper to update the join message with current player list
     */
    async function updateJoinMessage(ctx: any, state: GameState, entryFee: number) {
        const playerNames = state.players.map((p: PlayerEntry) => {
            const teamIcon = p.team === 'Red' ? '🔴 ' : p.team === 'Blue' ? '🔵 ' : '• ';
            const guestSuffix = p.isUnregistered ? ' 👤' : '';
            return `${teamIcon}${p.name}${guestSuffix}`;
        }).join('\n');

        return ctx.editMessageText(
            `🎉 <b>${state.quizTitle}</b> o'yini ochilyapti!\n` +
            `Format: ${state.gameMode === 'SOLO' ? '👤 Solo' : '👥 Team Battle'}\n\n` +
            `⏳ Qatnashish vaqti ketyapti...\n` +
            `💰 Kirish to'lovi: ${entryFee} coin\n` +
            `⚠️ <b>Kamida 4 kishi kerak!</b>\n\n` +
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
        ).catch(() => { });
    }

    bot.action('tg_add_time', async (ctx) => {
        const chatId = ctx.chat?.id.toString();
        if (!chatId || !(await gameSessions.has(chatId))) return ctx.answerCbQuery("O'yin xatosi", { show_alert: true });

        const state = (await gameSessions.get(chatId))!;
        if (state.status !== 'JOINING') return ctx.answerCbQuery("Buni faqat kutish vaqtida qilish mumkin", { show_alert: true });

        if (state.timer) clearTimeout(state.timer);
        if (state.joinTimerInterval) clearInterval(state.joinTimerInterval);

        state.joinSecondsLeft = 30;
        const entryFee = await SettingsService.get('tg_game_entry_fee', 10);

        const renderJoinMsg = (seconds: number) => {
            const playerNames = state.players.map((p: PlayerEntry) => {
                const teamIcon = p.team === 'Red' ? '🔴 ' : p.team === 'Blue' ? '🔵 ' : '• ';
                return `${teamIcon}${p.name}`;
            }).join('\n');

            return `🎉 <b>${state.quizTitle}</b> o'yini ochilyapti!\n` +
                `Format: ${state.gameMode === 'SOLO' ? '👤 Solo' : '👥 Team Battle'}\n\n` +
                `⏳ Qatnashish vaqti uzaytirildi (+30s)...\n` +
                `⏰ Qolgan vaqt: <b>${seconds}</b> soniya\n` +
                `💰 Kirish to'lovi: ${entryFee} coin\n` +
                `⚠️ <b>Kamida 4 kishi kerak!</b>\n\n` +
                `Qatnashuvchilar (${state.players.length}):\n${playerNames || '<i>Hali hech kim yo\'q</i>'}`;
        };

        state.joinTimerInterval = setInterval(async () => {
            if (state.joinSecondsLeft && state.joinSecondsLeft > 0) {
                state.joinSecondsLeft -= 1;

                if (state.joinSecondsLeft <= 0) {
                    clearInterval(state.joinTimerInterval);
                    startGamePlay(bot, chatId);
                    return;
                }
            }
        }, 1000);

        ctx.answerCbQuery("Vaqt yana 30 soniyaga uzaytirildi!");
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
            totalPoints = 1; // Base 1 XP
            
            // Speed Bonus: Correct answer within 3 seconds
            const now = Date.now();
            const timeTaken = now - (state.questionStartTime || now);
            let speedBonus = false;
            if (timeTaken <= 3000) {
                totalPoints += 1; // +1 Speed Bonus
                speedBonus = true;
            }

            player.score += totalPoints;
            player.streak++;

            if (player.team) {
                state.teamScores[player.team] += totalPoints;
            }

            if (speedBonus) {
                limiter.schedule(() => bot.telegram.sendMessage(chatId, `⚡ <b>${player.name}</b> juda tez (Speed Bonus +1 ball)!`, { parse_mode: 'HTML' })).catch(() => { });
            }

            if (player.streak >= 3) {
                // Streak message removed as per user request
            }
        } else {
            player.streak = 0;
        }

        await gameSessions.set(chatId, state);

        const feedbackMsg = isCorrect ? `✅ To'g'ri! +${totalPoints} XP` : `❌ Noto'g'ri! To'g'ri javob: ${q.options![q.correctIndex]}`;
        ctx.answerCbQuery(feedbackMsg);

        // Check if all players have answered
        if (state.players.every(p => p.hasAnswered)) {
            // Clear all timers and advance immediately
            if (state.timer) clearTimeout(state.timer);
            if (state.inactivityTimer) {
                clearTimeout(state.inactivityTimer);
                state.inactivityTimer = undefined;
            }
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

// ---------------- Duel Loop Functions ----------------

async function startDuelPlay(bot: Telegraf, inlineMsgId: string) {
    const state = await gameSessions.get(inlineMsgId);
    if (!state) return;
    state.status = 'PLAYING';
    state.currentQIndex = 0;
    await gameSessions.set(inlineMsgId, state);
    await sendDuelQuestion(bot, inlineMsgId);
}

function buildDuelKeyboard(q: Question) {
    const buttons: any[][] = [];
    if (q.options) {
        for (let i = 0; i < q.options.length; i += 2) {
            const row = [];
            row.push({ text: q.options[i], callback_data: `tg_duel_ans_${i}` });
            if (i + 1 < q.options.length) {
                row.push({ text: q.options[i + 1], callback_data: `tg_duel_ans_${i + 1}` });
            }
            buttons.push(row);
        }
    }
    return buttons;
}

async function sendDuelQuestion(bot: Telegraf, inlineMsgId: string) {
    const state = await gameSessions.get(inlineMsgId);
    if (!state) return;

    state.players.forEach(p => p.hasAnswered = false);

    const q = state.questions[state.currentQIndex];
    let text = `<b>Savol ${state.currentQIndex + 1} / ${state.questions.length}</b>\n\n${q.text}\n\n`;
    state.players.forEach(p => {
        text += `⏳ ${p.name}\n`;
    });

    const buttons = buildDuelKeyboard(q);

    state.questionStartTime = Date.now();
    try {
        await limiter.schedule(() => bot.telegram.editMessageText(undefined, undefined, inlineMsgId, text, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: buttons }
        }));

        state.timer = setTimeout(() => {
            moveNextDuel(bot, inlineMsgId);
        }, 30000);
        await gameSessions.set(inlineMsgId, state);
    } catch (e) {
        gameLogger.error("Error sending duel question:", e);
    }
}

async function moveNextDuel(bot: Telegraf, inlineMsgId: string) {
    const state = await gameSessions.get(inlineMsgId);
    if (!state) return;

    if (state.timer) clearTimeout(state.timer);

    const q = state.questions[state.currentQIndex];
    let correctText = q.options ? q.options[q.correctIndex] : '';

    let nextText = `Vaqt tugadi ⏳\n\nTo'g'ri javob: <b>${correctText}</b>`;

    try {
        await limiter.schedule(() => bot.telegram.editMessageText(undefined, undefined, inlineMsgId, nextText, { parse_mode: 'HTML' }));
    } catch (e) { }

    setTimeout(async () => {
        state.currentQIndex++;
        if (state.currentQIndex >= state.questions.length) {
            await finishGame(bot, inlineMsgId, true); // true = isDuel flag
        } else {
            await sendDuelQuestion(bot, inlineMsgId);
        }
    }, 2000);
}

// ---------------- Game Loop Functions ----------------

async function startGamePlay(bot: Telegraf, chatId: string) {
    const state = await gameSessions.get(chatId);
    if (!state) return;

    if (state.players.length < 4) {
        state.status = 'FINISHED';
        try {
            const entryFee = await SettingsService.get('tg_game_entry_fee', 10);
            for (const p of state.players) {
                if (!p.isUnregistered) {
                    await query('UPDATE students SET coins = coins + $1 WHERE id = $2', [entryFee, p.id]).catch(console.error);
                }
            }
            await limiter.schedule(() => bot.telegram.sendMessage(chatId, "❌ O'yin boshlanishi uchun kamida 4 kishi kerak edi. O'yin bekor qilindi va to'lovlar qaytarildi."));
        } catch (e) { }
        await gameSessions.delete(chatId);
        return;
    }

    state.status = 'PLAYING';
    state.currentQIndex = 0;

    await sendCountdown(bot, chatId, state.mainMessageId, () => {
        sendCurrentQuestion(bot, chatId);
    });
}

async function sendCountdown(bot: Telegraf, chatId: string, msgId: number | undefined, callback: () => void) {
    try {
        if (msgId) {
            await limiter.schedule(() => bot.telegram.editMessageText(chatId, msgId, undefined, `Tayyorlaning...\n\n🚀 BOSHLADIK!`));
        } else {
            const m = await limiter.schedule(() => bot.telegram.sendMessage(chatId, `Tayyorlaning...\n\n🚀 BOSHLADIK!`));
            msgId = m.message_id;
        }
    } catch (e) { } // ignore message not modified errors
    callback();
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

        // Start 25 second inactivity timer
        state.inactivityTimer = setTimeout(async () => {
            const currentState = await gameSessions.get(chatId);
            if (!currentState || currentState.status !== 'PLAYING' || currentState.currentQIndex !== state.currentQIndex) return;

            const sleepingPlayers = currentState.players.filter(p => !p.hasAnswered);
            for (const p of sleepingPlayers) {
                limiter.schedule(() => bot.telegram.sendMessage(chatId, `😴 <b>${p.name}</b> uxlab qoldi!`, { parse_mode: 'HTML' })).catch(() => { });
            }
        }, 25000);

        await gameSessions.set(chatId, state);
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
        const winner = red > blue ? '🔴 QIZILLAR' : blue > red ? '🔵 KO\'KLAR' : '🤝 DURANG';
        nextText += `\n\n🏆 <b>G'OLIB: ${winner}</b>\n`;
        nextText += `📊 Jamoalar: 🔴 ${red} - 🔵 ${blue}`;
    }

    try {
        await limiter.schedule(() => bot.telegram.editMessageText(chatId, state.mainMessageId, undefined,
            nextText, { parse_mode: 'HTML' }
        ));
    } catch (e) { }

    setTimeout(async () => {
        // Delete previous question message
        if (state.mainMessageId) {
            try {
                await bot.telegram.deleteMessage(chatId, state.mainMessageId).catch(() => { });
            } catch (e) { }
        }

        state.currentQIndex++;
        if (state.currentQIndex >= state.questions.length) {
            await finishGame(bot, chatId);
        } else {
            await sendCurrentQuestion(bot, chatId);
        }
    }, 2000); // pause 2s before next question
}

async function finishGame(bot: Telegraf, chatId: string, isDuel = false) {
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

    // Find winners based on score > 0
    const winningPlayers = state.players.filter(p => p.score > 0);
    const totalPool = state.totalCoinPool || 0;
    let distributedReward = 0;

    // In a 1v1 duel, if it's a tie, no one loses money (they just get their money back)
    // We can simulate this by splitting the total pool evenly.
    if (winningPlayers.length > 0 && totalPool > 0) {
        let isTie = false;
        if (state.players.length === 2 && state.players[0].score === state.players[1].score && state.players[0].score > 0) {
            isTie = true;
        }

        if (isTie) {
            const half = Math.floor(totalPool / 2);
            for (const p of state.players) {
                try {
                    await query('UPDATE students SET coins = coins + $1 WHERE id = $2', [half, p.id]);
                } catch (e) { }
                (p as any).rewardEarned = half;
            }
        } else {
            // Distribute proportional to score
            const totalWinningScore = winningPlayers.reduce((sum, p) => sum + p.score, 0);
            for (const p of winningPlayers) {
                const pReward = Math.floor((p.score / totalWinningScore) * totalPool);
                try {
                    if (pReward > 0 && !p.isUnregistered) {
                        await query('UPDATE students SET coins = coins + $1 WHERE id = $2', [pReward, p.id]);
                    }
                } catch (e) {
                    gameLogger.error(`Error giving reward to ${p.name}:`, e);
                }
                (p as any).rewardEarned = pReward;
            }
        }
    } else {
        board += `<i>💔 Hech kim to'g'ri javob topmadi. Barcha tangalar kuydi!</i>\n\n`;
    }

    const playerResultsMap: any[] = [];

    if (winningPlayers.length > 0) {
        board += `<b>🏆 G'OLIBLAR:</b>\n`;
        state.players.filter(p => p.score > 0).forEach((p, i) => {
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🎖";
            const rewardText = (p as any).rewardEarned > 0 ? ` (+${(p as any).rewardEarned} 🪙)` : '';
            const unregText = p.isUnregistered ? ' (Mehmon)' : '';
            board += `${medal} <b>${p.name}</b> — ${p.score} ball${rewardText}${unregText}\n`;
        });
        board += `\n`;
    }

    const losingPlayers = state.players.filter(p => p.score === 0);
    if (losingPlayers.length > 0) {
        board += `<b>💔 YUTQAZGANLAR:</b>\n`;
        losingPlayers.forEach(p => {
            const assumedFee = Math.floor(totalPool / state.players.length);
            board += `💀 ${p.name} — ${p.score} XP <i>(-${assumedFee} 🪙)</i>\n`;
        });
    }

    for (const p of state.players) {
        playerResultsMap.push({
            id: p.id,
            name: p.name,
            score: p.score
        });
    }

    try {
        if (isDuel) {
            await limiter.schedule(() => bot.telegram.editMessageText(undefined, undefined, chatId, board, { parse_mode: 'HTML' }));
        } else {
            await limiter.schedule(() => bot.telegram.sendMessage(chatId, board, { parse_mode: 'HTML' }));
        }
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
    const validTypes = ['text-input'];
    const pool = questions.filter(q => validTypes.includes(q.type || 'multiple-choice'));

    // Cache of all possible accepted answers to use as distractors for text-input
    const allAnswers = pool.flatMap(q => q.acceptedAnswers || []);

    return pool.map((q) => {
        if (q.type === 'text-input' && q.acceptedAnswers && q.acceptedAnswers.length > 0) {
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
                    CROSS JOIN jsonb_array_elements(
                        CASE WHEN jsonb_typeof(gr.player_results) = 'array' THEN gr.player_results ELSE '[]'::jsonb END
                    ) p
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
