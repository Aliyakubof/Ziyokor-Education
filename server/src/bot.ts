import { Telegraf } from 'telegraf';
import { query } from './db';

const token = process.env.TELEGRAM_BOT_TOKEN || '8564105202:AAFHcou7QISJjWQe0UQqjPLITIbkZq_2-c4';
export const bot = new Telegraf(token);

// Prevent bot from crashing the server on network errors
bot.catch((err: any, ctx: any) => {
    console.error(`Bot error for ${ctx.updateType}:`, err);
});

const userStates: Record<string, 'awaiting_teacher_phone' | 'awaiting_student_id' | 'awaiting_parent_id'> = {};

bot.start(async (ctx) => {
    try {
        const chatId = ctx.chat.id.toString();
        // Check for deep linking payload (e.g., /start 1234567)
        const text = ctx.message && (ctx.message as any).text ? (ctx.message as any).text : '';
        const payload = text.split(' ')[1];

        if (payload && /^\d{7}$/.test(payload)) {
            if (payload.startsWith('8') || payload.startsWith('9')) {
                await handleParentLogin(ctx, chatId, payload);
            } else {
                await handleStudentLogin(ctx, chatId, payload);
            }
            return;
        }

        if (payload === 'teacher') {
            userStates[chatId] = 'awaiting_teacher_phone';
            ctx.reply(
                'Assalomu alaykum! Ziyokor Education botiga o\'qituvchi sifatida xush kelibsiz.\n' +
                'Iltimos, telefon raqamingizni yuboring yoki kiriting.',
                {
                    reply_markup: {
                        keyboard: [[{ text: "📱 Telefon raqamni yuborish", request_contact: true }]],
                        one_time_keyboard: true,
                        resize_keyboard: true
                    }
                }
            );
            return;
        }

        console.log(`[Bot] Start command from ${chatId}`);
        ctx.reply(
            'Assalomu alaykum! Ziyokor Education botiga xush kelibsiz.\n\n' +
            '👤 <b>O\'quvchi yoki Ota-ona</b> bo\'lsangiz, tizimga ulanish uchun 7 xonali ID kodingizni yuboring.\n\n' +
            '👨‍🏫 <b>O\'qituvchi</b> bo\'lsangiz, pastdagi tugmani bosing:',
            {
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: [
                        [{ text: "👨‍🏫 O'qituvchi sifatida kirish" }]
                    ],
                    one_time_keyboard: true,
                    resize_keyboard: true
                }
            }
        );
    } catch (err) {
        console.error('[Bot] Start error:', err);
    }
});

bot.hears("👨‍🏫 O\'qituvchi sifatida kirish", (ctx) => {
    const chatId = ctx.chat.id.toString();
    userStates[chatId] = 'awaiting_teacher_phone';
    ctx.reply(
        'Iltimos, telefon raqamingizni yuboring yoki qo\'lda kiriting (masalan: 998901234567).',
        {
            reply_markup: {
                keyboard: [[{ text: "📱 Telefon raqamni yuborish", request_contact: true }]],
                one_time_keyboard: true,
                resize_keyboard: true
            }
        }
    );
});

const handleLogout = async (ctx: any) => {
    const chatId = ctx.chat.id.toString();
    console.log(`[Bot] Logout requested by ${chatId}`);

    // Clear state
    delete userStates[chatId];

    try {
        // 1. Remove from Teachers
        await query(
            'UPDATE teachers SET telegram_chat_id = NULL WHERE telegram_chat_id = $1',
            [chatId]
        );

        // 2. Remove from Student Subscriptions
        await query(
            'DELETE FROM student_telegram_subscriptions WHERE telegram_chat_id = $1',
            [chatId]
        );

        ctx.reply('✅ Siz muvaffaqiyatli hisobdan chiqdingiz. Qayta kirish uchun /start ni bosing.', {
            reply_markup: { remove_keyboard: true }
        });
    } catch (err) {
        console.error('[Bot] Logout error:', err);
        ctx.reply('❌ Xatolik yuz berdi.');
    }
};

bot.command('me', async (ctx) => {
    const chatId = ctx.chat.id.toString();
    console.log(`[Bot] /me checked by ${chatId}`);

    try {
        // Check if teacher
        const teacherRes = await query('SELECT * FROM teachers WHERE telegram_chat_id = $1', [chatId]);
        if ((teacherRes.rowCount || 0) > 0) {
            return ctx.reply(`👨‍🏫 Siz O'qituvchisiz: ${teacherRes.rows[0].name}`);
        }

        // Check if student subscriber
        const studentRes = await query(`
            SELECT s.name, s.id 
            FROM student_telegram_subscriptions sub
            JOIN students s ON sub.student_id = s.id
            WHERE sub.telegram_chat_id = $1
        `, [chatId]);

        if ((studentRes.rowCount || 0) > 0) {
            const names = studentRes.rows.map((r: any) => `${r.name} (${r.id})`).join(', ');
            return ctx.reply(`👨‍🎓 Siz quyidagi o'quvchilarga ulangansiz:\n${names}`);
        }

        ctx.reply('🤷‍♂️ Siz tizimga ulanmagansiz. /start ni bosing.');
    } catch (err) {
        console.error('[Bot] /me error:', err);
        ctx.reply('❌ Tekshirishda xatolik.');
    }
});

bot.command('logout', handleLogout);
bot.hears('🚪 Chiqish', handleLogout);

bot.on('contact', async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const contact = ctx.message.contact;
    let phone = contact.phone_number.replace('+', '');
    handleTeacherLogin(ctx, chatId, phone);
});

bot.on('text', async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const text = ctx.message.text.trim();
    const state = userStates[chatId];

    // Priority 1: Check if it's a 7-digit ID (Auto-login for Student/Parent)
    if (/^\d{7}$/.test(text)) {
        if (text.startsWith('8') || text.startsWith('9')) {
            await handleParentLogin(ctx, chatId, text);
        } else {
            await handleStudentLogin(ctx, chatId, text);
        }
        delete userStates[chatId];
        return;
    }

    // Priority 2: Handling specific states
    if (state === 'awaiting_teacher_phone') {
        let phone = text.replace(/[+\s]/g, '');
        if (!/^\d{9,15}$/.test(phone)) {
            return ctx.reply('❌ Iltimos, to\'g\'ri telefon raqam kiriting.');
        }
        await handleTeacherLogin(ctx, chatId, phone);
        delete userStates[chatId];
    }
});

async function handleTeacherLogin(ctx: any, chatId: string, phone: string) {
    try {
        console.log(`[Bot] Teacher login attempt: ${phone} (chat: ${chatId})`);
        // Try exact match first
        let result = await query(
            'UPDATE teachers SET telegram_chat_id = $1 WHERE phone = $2 RETURNING *',
            [chatId, phone]
        );

        // If no match, try adding/removing '+'
        if (result.rowCount === 0) {
            const altPhone = phone.startsWith('+') ? phone.slice(1) : `+${phone}`;
            result = await query(
                'UPDATE teachers SET telegram_chat_id = $1 WHERE phone = $2 RETURNING *',
                [chatId, altPhone]
            );
        }

        if (result.rowCount && result.rowCount > 0) {
            console.log(`[Bot] Teacher logged in: ${result.rows[0].name}`);
            ctx.reply(`✅ Muvaffaqiyatli! Siz O'qituvchi sifatida ulandingiz: ${result.rows[0].name}`, {
                reply_markup: {
                    keyboard: [[{ text: "🚪 Chiqish" }]],
                    resize_keyboard: true
                }
            });
        } else {
            console.log(`[Bot] Teacher not found for phone: ${phone}`);
            ctx.reply('❌ Bu raqam bilan o\'qituvchi topilmadi. Admin bilan bog\'laning yoki raqamni to\'g\'ri kiriting (998...)');
        }
    } catch (err) {
        console.error('[Bot] Teacher login error:', err);
        ctx.reply('❌ Tizimda xatolik yuz berdi.');
    }
}

async function handleStudentLogin(ctx: any, chatId: string, studentId: string) {
    try {
        console.log(`[Bot] Student login attempt: ${studentId} (chat: ${chatId})`);

        // 1. Check if student exists
        const studentRes = await query('SELECT * FROM students WHERE id = $1', [studentId]);
        if (studentRes.rowCount === 0) {
            console.log(`[Bot] Student ID not found: ${studentId}`);
            return ctx.reply('❌ Bunday ID ga ega o\'quvchi topilmadi.');
        }
        const student = studentRes.rows[0];

        // Subscription check and add... (existing logic)
        await addSubscription(ctx, chatId, student);
    } catch (err) {
        console.error('[Bot] Student login error:', err);
        ctx.reply('❌ Tizimda xatolik yuz berdi.');
    }
}

async function handleParentLogin(ctx: any, chatId: string, parentId: string) {
    try {
        console.log(`[Bot] Parent login attempt: ${parentId} (chat: ${chatId})`);

        // 1. Find student by parent_id
        const studentRes = await query('SELECT * FROM students WHERE parent_id = $1', [parentId]);
        if (studentRes.rowCount === 0) {
            console.log(`[Bot] Parent ID not found: ${parentId}`);
            return ctx.reply('❌ Bunday ota-ona ID kodi topilmadi. Iltimos, o\'qituvchidan ID kodni so\'rang.');
        }
        const student = studentRes.rows[0];

        await addSubscription(ctx, chatId, student, true);
    } catch (err) {
        console.error('[Bot] Parent login error:', err);
        ctx.reply('❌ Tizimda xatolik yuz berdi.');
    }
}

async function addSubscription(ctx: any, chatId: string, student: any, isParent = false) {
    const studentId = student.id;
    // 2. Check subscription count (limit 3 per student)
    const subRes = await query(
        'SELECT COUNT(*) FROM student_telegram_subscriptions WHERE student_id = $1',
        [studentId]
    );
    const count = parseInt(subRes.rows[0].count);

    // 3. Check if already subscribed
    const checkMySub = await query(
        'SELECT * FROM student_telegram_subscriptions WHERE student_id = $1 AND telegram_chat_id = $2',
        [studentId, chatId]
    );

    if (checkMySub.rowCount && checkMySub.rowCount > 0) {
        return ctx.reply(`ℹ️ Siz allaqachon ulandingiz: ${student.name}`, {
            reply_markup: {
                keyboard: [[{ text: "🚪 Chiqish" }]],
                resize_keyboard: true
            }
        });
    }

    if (count >= 3) {
        return ctx.reply('❌ Bu o\'quvchi profiliga allaqachon 3 ta telegram hisob ulangan. Limit tugagan.');
    }

    // 4. Add subscription
    await query(
        'INSERT INTO student_telegram_subscriptions (student_id, telegram_chat_id) VALUES ($1, $2)',
        [studentId, chatId]
    );

    ctx.reply(`✅ Muvaffaqiyatli! Siz ${isParent ? "ota-ona sifatida" : "o'quvchi sifatida"} ulandingiz: ${student.name}\nBarcha natijalar shu yerga yuboriladi.`, {
        reply_markup: {
            keyboard: [[{ text: "🚪 Chiqish" }]],
            resize_keyboard: true
        }
    });
}

/**
 * Sends a notification to a teacher.
 */
export async function notifyTeacher(chatId: string, message: string) {
    try {
        await bot.telegram.sendMessage(chatId, message, { parse_mode: 'HTML' });
    } catch (err) {
        console.error(`[Bot] notifyTeacher error for ${chatId}:`, err);
    }
}

/**
 * Sends a notification to a student's subscribers.
 */
export async function notifyStudentSubscribers(studentId: string, message: string) {
    try {
        const subs = await query('SELECT telegram_chat_id FROM student_telegram_subscriptions WHERE student_id = $1', [studentId]);
        for (const sub of subs.rows) {
            try {
                await bot.telegram.sendMessage(sub.telegram_chat_id, message, { parse_mode: 'HTML' });
            } catch (e) {
                // ignore individual errors
            }
        }
    } catch (err) {
        console.error(`[Bot] notifyStudentSubscribers error for ${studentId}:`, err);
    }
}

/**
 * Weekly Reports: Top 3 & Inactive Students
 */
export async function sendWeeklyReports() {
    try {
        console.log('[Bot] Starting weekly reports...');
        const teachers = await query('SELECT id, name, telegram_chat_id FROM teachers WHERE telegram_chat_id IS NOT NULL');

        for (const teacher of teachers.rows) {
            try {
                // 1. Top 3 Students
                const topRes = await query(`
                    SELECT s.name, SUM((player->>'score')::int) as weekly_score
                    FROM game_results gr, jsonb_array_elements(player_results) as player
                    JOIN students s ON player->>'id' = s.id
                    JOIN groups g ON s.group_id = g.id
                    WHERE g.teacher_id = $1
                      AND gr.created_at >= NOW() - INTERVAL '7 days'
                    GROUP BY s.id, s.name
                    ORDER BY weekly_score DESC
                    LIMIT 3
                `, [teacher.id]);

                // 2. Inactive Students
                const inactiveRes = await query(`
                    SELECT s.name, g.name as group_name
                    FROM students s
                    JOIN groups g ON s.group_id = g.id
                    WHERE g.teacher_id = $1
                      AND (s.last_activity_at < NOW() - INTERVAL '7 days' OR s.last_activity_at IS NULL)
                `, [teacher.id]);

                let msg = `📊 <b>Haftalik Hisobot: ${teacher.name}</b>\n\n`;

                if (topRes.rowCount && topRes.rowCount > 0) {
                    msg += `🏆 <b>Hafta qahramonlari:</b>\n`;
                    topRes.rows.forEach((r: any, i: number) => {
                        msg += `${i + 1}. ${r.name} - ${r.weekly_score} XP\n`;
                    });
                } else {
                    msg += `🏆 Hafta davomida testlar o'tkazilmagan.\n`;
                }

                if (inactiveRes.rowCount && inactiveRes.rowCount > 0) {
                    msg += `\n💤 <b>Faol bo'lmagan o'quvchilar:</b>\n`;
                    inactiveRes.rows.slice(0, 10).forEach((r: any) => {
                        msg += `• ${r.name} (${r.group_name})\n`;
                    });
                    if (inactiveRes.rowCount > 10) msg += `...va yana ${inactiveRes.rowCount - 10} kishi.\n`;
                }

                await bot.telegram.sendMessage(teacher.telegram_chat_id, msg, { parse_mode: 'HTML' });
            } catch (e) {
                console.error(`[Bot] Error sending report to teacher ${teacher.id}:`, e);
            }
        }
    } catch (err) {
        console.error('[Bot] sendWeeklyReports error:', err);
    }
}

export const launchBot = () => {
    bot.launch().then(() => {
        console.log('Telegram bot started');
    }).catch(err => {
        console.error('Bot launch error:', err);
    });

    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
};
