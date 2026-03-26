import { Telegraf } from 'telegraf';
import bcrypt from 'bcrypt';
import { query } from './db';
import { setupTelegramGame } from './telegram_game';
import { generateNextDaySchedulePDF } from './pdfGenerator';
import { ADMIN_ID, MANAGER_ID } from './constants';

const token = process.env.TELEGRAM_BOT_TOKEN || '8564105202:AAFHcou7QISJjWQe0UQqjPLITIbkZq_2-c4';
export const bot = new Telegraf(token);

setupTelegramGame(bot);

// Prevent bot from crashing the server on network errors
bot.catch((err: any, ctx: any) => {
    console.error(`Bot error for ${ctx.updateType}:`, err);
});

const userStates: Record<string, 'awaiting_teacher_phone' | 'awaiting_student_id' | 'awaiting_parent_id' | 'awaiting_password' | 'awaiting_broadcast'> = {};
const tempLoginData: Record<string, { studentId: string, role: 'student' | 'parent', studentName: string }> = {};

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
            if (ctx.chat.type !== 'private') {
                return ctx.reply('❌ O\'qituvchi sifatida kirish faqat shaxsiy yozishmalarda (botning o\'zida) amalga oshiriladi.');
            }
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

        if (payload === 'manager') {
            if (ctx.chat.type !== 'private') {
                return ctx.reply('❌ Menejer sifatida ulanish faqat shaxsiy yozishmalarda amalga oshiriladi.');
            }
            await handleManagerAutoLogin(ctx, chatId);
            return;
        }

        console.log(`[Bot] Start command from ${chatId}`);

        if (ctx.chat.type !== 'private') {
            return ctx.reply(
                'Assalomu alaykum! Ziyokor Education guruh botiga xush kelibsiz.\n\n' +
                'O\'yin o\'ynash uchun /start_game buyrug\'idan foydalaning.'
            );
        }

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

bot.hears("👨‍🏫 O'qituvchi sifatida kirish", (ctx) => {
    if (ctx.chat.type !== 'private') {
        return ctx.reply('❌ O\'qituvchi sifatida kirish faqat shaxsiy yozishmalarda amalga oshiriladi.');
    }
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
    delete tempLoginData[chatId];

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

const MANAGER_PHONE = '998947212531';

async function isManager(chatId: string) {
    const res = await query('SELECT * FROM teachers WHERE telegram_chat_id = $1 AND REPLACE(phone, \'+\', \'\') = $2', [chatId, MANAGER_PHONE]);
    return (res.rowCount || 0) > 0;
}

bot.hears('📊 Haftalik Hisobot', async (ctx) => {
    const chatId = ctx.chat?.id.toString();
    if (!chatId || !await isManager(chatId)) return;

    try {
        const teachers = await query(`
            SELECT id, name 
            FROM teachers 
            ORDER BY name ASC`
        );


        if (teachers.rowCount === 0) return ctx.reply('Faol o\'qituvchilar topilmadi.');

        const buttons = teachers.rows.map((t: any) => ([{
            text: t.name,
            callback_data: `mg_rep_${t.id}`
        }]));

        ctx.reply('📊 Hisobot uchun o\'qituvchini tanlang:', {
            reply_markup: { inline_keyboard: buttons }
        });
    } catch (err) {
        ctx.reply('Xatolik yuz berdi.');
    }
});

bot.action(/^mg_rep_(.+)$/, async (ctx) => {
    const teacherId = ctx.match[1];
    const chatId = ctx.chat?.id.toString();
    if (!chatId || !await isManager(chatId)) return;

    await sendTeacherWeeklyReport(ctx, teacherId);
});

bot.hears('📉 Potentional fail', async (ctx) => {
    const chatId = ctx.chat?.id.toString();
    if (!chatId || !await isManager(chatId)) return;

    try {
        const teachers = await query(`
            SELECT id, name 
            FROM teachers 
            ORDER BY name ASC`
        );


        if (teachers.rowCount === 0) return ctx.reply('Faol o\'qituvchilar topilmadi.');

        const buttons = teachers.rows.map((t: any) => ([{
            text: t.name,
            callback_data: `mg_t_${t.id}`
        }]));

        ctx.reply('📉 Potentional fail uchun o\'qituvchini tanlang:', {
            reply_markup: { inline_keyboard: buttons }
        });
    } catch (err) {
        console.error('Potential fail error:', err);
        ctx.reply('Xatolik yuz berdi.');
    }
});

// Inline handlers for Manager Potential Fail
bot.action(/^mg_t_(.+)$/, async (ctx) => {
    const teacherId = ctx.match[1];
    try {
        const groups = await query('SELECT id, name FROM groups WHERE teacher_id = $1 ORDER BY name ASC', [teacherId]);
        if (groups.rowCount === 0) return ctx.answerCbQuery('Bu o\'qituvchida guruhlar yo\'q.');

        const buttons = groups.rows.map((g: any) => ([{
            text: g.name,
            callback_data: `mg_g_${g.id}`
        }]));

        await ctx.editMessageText('📚 Guruhni tanlang:', {
            reply_markup: { inline_keyboard: buttons }
        });
    } catch (err) {
        ctx.answerCbQuery('Xatolik.');
    }
});

bot.action(/^mg_g_(.+)$/, async (ctx) => {
    const groupId = ctx.match[1];
    try {
        // Find top 5 lowest coins/score students in group
        const students = await query(`
            SELECT name, coins, last_activity_at 
            FROM students 
            WHERE group_id = $1 
            ORDER BY coins ASC 
            LIMIT 5
        `, [groupId]);

        if (students.rowCount === 0) return ctx.answerCbQuery('O\'quvchilar yo\'q.');

        let msg = `📉 <b>Guruhdagi eng past ko'rsatkichli o'quvchilar:</b>\n\n`;
        students.rows.forEach((s: any, i: number) => {
            msg += `${i + 1}. ${s.name} - ${s.coins} XP\n`;
            if (s.last_activity_at) {
                msg += `   🕒 Oxirgi faollik: ${new Date(s.last_activity_at).toLocaleDateString('uz-UZ')}\n`;
            } else {
                msg += `   🕒 Faollik qayd etilmagan.\n`;
            }
        });

        await ctx.editMessageText(msg, { parse_mode: 'HTML' });
    } catch (err) {
        ctx.answerCbQuery('Xatolik.');
    }
});

async function sendTeacherWeeklyReport(ctx: any, teacherId: string) {
    try {
        const teacherRes = await query('SELECT name FROM teachers WHERE id = $1', [teacherId]);
        if (teacherRes.rowCount === 0) return ctx.answerCbQuery('O\'qituvchi topilmadi.');
        const teacherName = teacherRes.rows[0].name;

        // 1. Tests in last 7 days and Last test date
        const activityRes = await query(`
            SELECT 
                COUNT(*) FILTER (WHERE gr.created_at >= NOW() - INTERVAL '7 days') as tests_count,
                MAX(gr.created_at) as last_test_at
            FROM game_results gr
            JOIN groups g ON gr.group_id = g.id
            WHERE g.teacher_id = $1
        `, [teacherId]);

        const testsCount = parseInt(activityRes.rows[0].tests_count || '0');
        const lastTestAt = activityRes.rows[0].last_test_at;

        // 2. Contacts in last 7 days
        const contactsRes = await query(`
            SELECT COUNT(*) as contacts_count
            FROM contact_logs cl
            JOIN students s ON cl.student_id = s.id
            JOIN groups g ON s.group_id = g.id
            WHERE g.teacher_id = $1 AND cl.contacted_at >= NOW() - INTERVAL '7 days'
        `, [teacherId]);
        const contactsCount = parseInt(contactsRes.rows[0].contacts_count || '0');

        // 3. Top Student
        const topRes = await query(`
            SELECT s.name, SUM((p->>'score')::int) as weekly_score
            FROM game_results gr
            JOIN groups g ON gr.group_id = g.id
            CROSS JOIN jsonb_array_elements(
                CASE WHEN jsonb_typeof(gr.player_results) = 'array' THEN gr.player_results ELSE '[]'::jsonb END
            ) p
            JOIN students s ON p->>'id' = s.id
            WHERE g.teacher_id = $1
              AND gr.created_at >= NOW() - INTERVAL '7 days'
            GROUP BY s.id, s.name
            ORDER BY weekly_score DESC
            LIMIT 1
        `, [teacherId]);

        let report = `📊 <b>HAFTALIK HISOBOT: ${teacherName}</b>\n\n`;
        report += `📝 Testlar: ${testsCount} ta\n`;
        report += `📞 Bog'lanishlar: ${contactsCount} ta\n`;

        if (topRes.rowCount && topRes.rowCount > 0) {
            report += `🏆 Top o'quvchi: ${topRes.rows[0].name} (${topRes.rows[0].weekly_score} XP)\n`;
        }

        // Warning check (8 days)

        if (lastTestAt) {
            const lastDate = new Date(lastTestAt);
            const diffDays = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays >= 8) {
                report += `\n⚠️ <b>Ogohlantirish: ${diffDays} kundan beri test o'tkazilmagan!</b>\n`;
            }
        } else {
            report += `\n⚠️ <b>Ogohlantirish: Hali birorta ham test o'tkazilmagan!</b>\n`;
        }

        await ctx.editMessageText(report, { parse_mode: 'HTML' });
    } catch (err) {
        console.error('Teacher weekly report error:', err);
        ctx.answerCbQuery('Hisobotda xatolik.');
    }
}

async function sendWeeklyReportsForManager(ctx: any, managerChatId: string) {
    // Keep this for scheduled tasks if needed
}

bot.on('contact', async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const contact = ctx.message.contact;
    let phone = contact.phone_number.replace('+', '');
    handleTeacherLogin(ctx, chatId, phone);
});

bot.hears('👨‍👩‍👧‍👦 Ota-ona', async (ctx) => {
    const chatId = ctx.chat?.id.toString();
    try {
        const teacherRes = await query('SELECT id FROM teachers WHERE telegram_chat_id = $1', [chatId]);
        if (teacherRes.rowCount === 0) return ctx.reply('❌ Siz o\'qituvchi sifatida ro\'yxatdan o\'tmagansiz.');
        const teacherId = teacherRes.rows[0].id;

        const groups = await query('SELECT id, name FROM groups WHERE teacher_id = $1 ORDER BY name ASC', [teacherId]);
        if (groups.rowCount === 0) return ctx.reply('❌ Sizda guruhlar topilmadi.');

        const buttons = groups.rows.map((g: any) => ([{
            text: g.name,
            callback_data: `t_g_${g.id}`
        }]));

        ctx.reply('📚 Guruhni tanlang:', {
            reply_markup: { inline_keyboard: buttons }
        });
    } catch (err) {
        ctx.reply('❌ Xatolik yuz berdi.');
    }
});

bot.action(/^t_g_(.+)$/, async (ctx) => {
    const groupId = ctx.match[1];
    try {
        const students = await query('SELECT id, name FROM students WHERE group_id = $1 ORDER BY name ASC', [groupId]);
        if (students.rowCount === 0) return ctx.answerCbQuery('O\'quvchilar yo\'q.');

        const subs = await query('SELECT student_id FROM student_telegram_subscriptions WHERE student_id = ANY($1) AND role = \'parent\'', [students.rows.map((s: any) => s.id)]);
        const connectedIds = new Set(subs.rows.map((s: any) => s.student_id));

        let msg = `👨‍👩‍👧‍👦 <b>Ota-ona ulanish holati:</b>\n\n`;
        students.rows.forEach((s: any, i: number) => {
            const isConnected = connectedIds.has(s.id);
            msg += `${i + 1}. ${s.name} - ${isConnected ? '✅' : '❌'}\n`;
        });

        msg += `\n📊 Jami: ${connectedIds.size}/${students.rowCount}`;

        await ctx.editMessageText(msg, { parse_mode: 'HTML' });
    } catch (err) {
        ctx.answerCbQuery('Xatolik.');
    }
});

bot.hears('📢 Xabar Yuborish', async (ctx) => {
    const chatId = ctx.chat?.id.toString();
    if (!chatId || !await isManager(chatId)) return;

    userStates[chatId] = 'awaiting_broadcast';
    ctx.reply('📝 O\'qituvchilarga yubormoqchi bo\'lgan xabaringizni yozing:');
});

bot.hears('🚪 Chiqish', handleLogout);

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
        return;
    }

    if (state === 'awaiting_password') {
        const data = tempLoginData[chatId];
        if (!data) {
            delete userStates[chatId];
            return ctx.reply('❌ Sessiya muddati tugadi. Iltimos, ID kodni qayta yuboring.');
        }

        try {
            const studentRes = await query('SELECT password FROM students WHERE id = $1', [data.studentId]);
            const hashedPassword = studentRes.rows[0]?.password;

            if (!hashedPassword) {
                return ctx.reply('❌ Parol topilmadi. O\'qituvchi bilan bog\'laning.');
            }

            const match = await bcrypt.compare(text, hashedPassword);
            if (match || text === hashedPassword) { // Fallback for unhashed passwords
                await addSubscription(ctx, chatId, { id: data.studentId, name: data.studentName }, false);
                delete userStates[chatId];
                delete tempLoginData[chatId];
            } else {
                ctx.reply('❌ Parol noto\'g\'ri. Iltimos, qaytadan urinib ko\'ring:');
            }
        } catch (err) {
            console.error('[Bot] Password verification error:', err);
            ctx.reply('❌ Xatolik yuz berdi.');
        }
        return;
    }

    if (state === 'awaiting_broadcast' && await isManager(chatId)) {
        try {
            const teachers = await query('SELECT telegram_chat_id FROM teachers WHERE telegram_chat_id IS NOT NULL AND phone != $1', [MANAGER_PHONE]);
            let count = 0;
            for (const t of teachers.rows) {
                try {
                    await bot.telegram.sendMessage(t.telegram_chat_id, `📢 <b>MENEJERDAN XABAR:</b>\n\n${text}`, { parse_mode: 'HTML' });
                    count++;
                } catch (e) { }
            }
            ctx.reply(`✅ Xabar ${count} ta o'qituvchiga yuborildi.`);
            delete userStates[chatId];
        } catch (err) {
            console.error('Broadcast error:', err);
            ctx.reply('❌ Xabar yuborishda xatolik.');
        }
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
                    keyboard: [
                        [{ text: "👨‍👩‍👧‍👦 Ota-ona" }],
                        [{ text: "🚪 Chiqish" }]
                    ],
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

async function handleManagerAutoLogin(ctx: any, chatId: string) {
    try {
        console.log(`[Bot] Manager auto-login attempt (chat: ${chatId})`);
        const managerPhone = '998947212531'; // Hardcoded manager phone as per app.ts

        const result = await query(
            'UPDATE teachers SET telegram_chat_id = $1 WHERE phone = $2 RETURNING *',
            [chatId, managerPhone]
        );

        if (result.rowCount && result.rowCount > 0) {
            console.log(`[Bot] Manager auto-linked: ${result.rows[0].name}`);
            ctx.reply(`✅ Muvaffaqiyatli! Siz Menejer sifatida ulandingiz: ${result.rows[0].name}\nEndi barcha hisobotlar shu yerga yuboriladi.`, {
                reply_markup: {
                    keyboard: [
                        [{ text: "📊 Haftalik Hisobot" }, { text: "📉 Potentional fail" }],
                        [{ text: "📢 Xabar Yuborish" }, { text: "🚪 Chiqish" }]
                    ],
                    resize_keyboard: true
                }
            });
        } else {
            console.log(`[Bot] Manager not found for auto-login`);
            ctx.reply('❌ Menejer ma\'lumotlari topilmadi. Tizimga kirganingizni tekshiring.');
        }
    } catch (err) {
        console.error('[Bot] Manager auto-login error:', err);
        ctx.reply('❌ Avtomatik ulanishda xatolik yuz berdi.');
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

        // Check if student already linked (limit 1)
        const subRes = await query(
            'SELECT * FROM student_telegram_subscriptions WHERE student_id = $1 AND role = $2',
            [studentId, 'student']
        );

        if (subRes.rowCount && subRes.rowCount > 0) {
            // Check if it's the same user
            if (subRes.rows[0].telegram_chat_id === chatId) {
                return ctx.reply(`ℹ️ Siz allaqachon o'quvchi sifatida ulandingiz: ${student.name}`, {
                    reply_markup: {
                        keyboard: [[{ text: "🚪 Chiqish" }]],
                        resize_keyboard: true
                    }
                });
            }
            return ctx.reply('❌ Ushbu o\'quvchi profiliga allaqachon boshqa telegram hisobi ulangan (Limit: 1).');
        }

        // Ask for password
        userStates[chatId] = 'awaiting_password';
        tempLoginData[chatId] = { studentId: student.id, role: 'student', studentName: student.name };
        ctx.reply(`🔓 <b>${student.name}</b>, profilingizni ulash uchun ilovaga (zeducation.uz) kiradigan parolingizni yuboring:`, { parse_mode: 'HTML' });

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

        // Check parent limit (2)
        const subRes = await query(
            'SELECT COUNT(*) FROM student_telegram_subscriptions WHERE student_id = $1 AND role = $2',
            [student.id, 'parent']
        );
        const count = parseInt(subRes.rows[0].count);

        if (count >= 2) {
            // Check if I am one of them
            const mySub = await query(
                'SELECT * FROM student_telegram_subscriptions WHERE student_id = $1 AND telegram_chat_id = $2 AND role = $3',
                [student.id, chatId, 'parent']
            );
            if (mySub.rowCount && mySub.rowCount > 0) {
                return ctx.reply(`ℹ️ Siz allaqachon ota-ona sifatida ulandingiz: ${student.name}`, {
                    reply_markup: {
                        keyboard: [[{ text: "🚪 Chiqish" }]],
                        resize_keyboard: true
                    }
                });
            }
            return ctx.reply('❌ Ushbu o\'quvchi profiliga allaqachon 2 ta ota-ona hisobi ulangan. Limit tugagan.');
        }

        await addSubscription(ctx, chatId, student, true);
    } catch (err) {
        console.error('[Bot] Parent login error:', err);
        ctx.reply('❌ Tizimda xatolik yuz berdi.');
    }
}

async function addSubscription(ctx: any, chatId: string, student: any, isParent = false) {
    const studentId = student.id;
    const role = isParent ? 'parent' : 'student';

    // Check if already subscribed with any role
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

    // Add subscription with role
    await query(
        'INSERT INTO student_telegram_subscriptions (student_id, telegram_chat_id, role) VALUES ($1, $2, $3)',
        [studentId, chatId, role]
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
 * Sends a Solo Quiz result PDF to subscribers.
 */
export async function sendSoloQuizPDF(studentId: string, pdfBuffer: Buffer, filename: string, caption: string) {
    try {
        const subs = await query('SELECT telegram_chat_id FROM student_telegram_subscriptions WHERE student_id = $1', [studentId]);
        
        // Also find group teacher and notify them
        const teacherRes = await query(`
            SELECT t.telegram_chat_id 
            FROM teachers t
            JOIN groups g ON g.teacher_id = t.id
            JOIN students s ON s.group_id = g.id
            WHERE s.id = $1 AND t.telegram_chat_id IS NOT NULL
        `, [studentId]);

        const allChatIds = new Set<string>();
        subs.rows.forEach((s: any) => allChatIds.add(s.telegram_chat_id));
        teacherRes.rows.forEach((t: any) => allChatIds.add(t.telegram_chat_id));

        // Also find Manager and Admin and notify them
        const oversightRes = await query('SELECT telegram_chat_id FROM teachers WHERE id = ANY($1) AND telegram_chat_id IS NOT NULL', [[ADMIN_ID, MANAGER_ID]]);
        oversightRes.rows.forEach((row: any) => allChatIds.add(row.telegram_chat_id));

        for (const chatId of allChatIds) {
            try {
                await bot.telegram.sendDocument(chatId, {
                    source: pdfBuffer,
                    filename: filename
                }, {
                    caption: caption,
                    parse_mode: 'HTML'
                });
            } catch (e) {
                console.error(`Error sending PDF to ${chatId}:`, e);
            }
        }
    } catch (err) {
        console.error('[Bot] sendSoloQuizPDF error:', err);
    }
}

/**
 * Battle Alert: Notify teacher groups about close battles or lead changes.
 */
export async function sendBattleAlert(battleId: string) {
    try {
        const battleRes = await query(`
            SELECT 
                b.id, b.score_a, b.score_b, b.group_a_id, b.group_b_id,
                g1.name as group_a_name, g2.name as group_b_name,
                t1.telegram_chat_id as chat_a, t2.telegram_chat_id as chat_b
            FROM group_battles b
            JOIN groups g1 ON b.group_a_id = g1.id
            JOIN groups g2 ON b.group_b_id = g2.id
            LEFT JOIN teachers t1 ON g1.teacher_id = t1.id
            LEFT JOIN teachers t2 ON g2.teacher_id = t2.id
            WHERE b.id = $1 AND b.status = 'active'
        `, [battleId]);
        if (!battleRes.rowCount || battleRes.rowCount === 0) return;

        const b = battleRes.rows[0];
        const total = b.score_a + b.score_b;
        if (total < 200) return; // Not worth alerting yet

        const gap = Math.abs(b.score_a - b.score_b);
        const gapPct = total > 0 ? (gap / total) * 100 : 0;

        // Only alert if it's a close race (within 10%)
        if (gapPct > 10) return;

        const leader = b.score_a >= b.score_b ? b.group_a_name : b.group_b_name;
        const trailer = b.score_a >= b.score_b ? b.group_b_name : b.group_a_name;
        const msg = `⚡ <b>Battle yangilanmoqda!</b>\n\n🏆 <b>${leader}</b> ozgina oldinda!\n🔥 <b>${trailer}</b> quvib yetmoqda!\n\nHar bir savol natijasi hisobga olinadi! 💪\n<i>Jarang + ${b.score_a.toLocaleString()} vs ${b.score_b.toLocaleString()} XP</i>`;

        const chatIds = [b.chat_a, b.chat_b].filter(Boolean);
        for (const chatId of chatIds) {
            try {
                await bot.telegram.sendMessage(chatId, msg, { parse_mode: 'HTML' });
            } catch (e) {
                // Ignore send errors for individual chats
            }
        }
        console.log(`[Bot] Battle alert sent for battle ${battleId} (gap: ${gapPct.toFixed(1)}%)`);
    } catch (err) {
        console.error('[Bot] sendBattleAlert error:', err);
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
                    SELECT s.name, SUM((p->>'score')::int) as weekly_score
                    FROM game_results gr
                    JOIN groups g ON gr.group_id = g.id
                    CROSS JOIN jsonb_array_elements(
                        CASE WHEN jsonb_typeof(gr.player_results) = 'array' THEN gr.player_results ELSE '[]'::jsonb END
                    ) p
                    JOIN students s ON p->>'id' = s.id
                    WHERE g.teacher_id = $1
                      AND gr.created_at >= NOW() - INTERVAL '7 days'
                    GROUP BY s.id, s.name
                    ORDER BY weekly_score DESC
                    LIMIT 3
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

                await bot.telegram.sendMessage(teacher.telegram_chat_id, msg, { parse_mode: 'HTML' });

            } catch (e) {
                console.error(`[Bot] Error sending report to teacher ${teacher.id}:`, e);
            }

        }
    } catch (err) {
        console.error('[Bot] sendWeeklyReports error:', err);
    }
}

/**
 * Daily Schedule Report: Sends tomorrow's bookings to teachers.
 */
export async function sendDailyScheduleToTeachers() {
    try {
        console.log('[Bot] Generating daily schedule reports...');
        
        // 1. Determine "Tomorrow" and its day name in Uzbek
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayNames = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
        const tomorrowDayName = dayNames[tomorrow.getDay()];
        const dateStr = tomorrow.toLocaleDateString('uz-UZ');

        // 2. Fetch all teachers with telegram_chat_id
        const teachers = await query('SELECT id, name, telegram_chat_id FROM teachers WHERE telegram_chat_id IS NOT NULL');

        for (const teacher of teachers.rows) {
            try {
                // 3. Find bookings for this teacher's groups for tomorrow
                // Note: Our system doesn't store a 'booking_date' column yet, 
                // but we know which days are extra class days for each group.
                // The user wants to know who booked for tomorrow.
                
                const bookings = await query(`
                    SELECT ecb.*, g.name as group_name, s.name as student_name
                    FROM extra_class_bookings ecb
                    JOIN groups g ON ecb.group_id = g.id
                    JOIN students s ON ecb.student_id = s.id
                    WHERE g.teacher_id = $1 
                      AND g.extra_class_days @> ARRAY[$2]::varchar[]
                      AND ecb.is_completed = false
                    ORDER BY ecb.time_slot ASC
                `, [teacher.id, tomorrowDayName]);

                if (bookings.rowCount && bookings.rowCount > 0) {
                    const pdfBuffer = await generateNextDaySchedulePDF(
                        teacher.name,
                        dateStr,
                        bookings.rows
                    );

                    await bot.telegram.sendDocument(teacher.telegram_chat_id, {
                        source: pdfBuffer,
                        filename: `jadval-${dateStr}.pdf`
                    }, {
                        caption: `📅 <b>Ertangi kun jadvali (${dateStr}):</b>\n\nJami: ${bookings.rowCount} ta dars.`,
                        parse_mode: 'HTML'
                    });
                    console.log(`[Bot] Schedule sent to teacher: ${teacher.name}`);
                }
            } catch (e) {
                console.error(`[Bot] Error sending schedule to teacher ${teacher.id}:`, e);
            }
        }
    } catch (err) {
        console.error('[Bot] sendDailyScheduleToTeachers error:', err);
    }
}

export const launchBot = async () => {
    try {
        await bot.telegram.setMyCommands([
            { command: 'start', description: 'Botni ishga tushirish' },
            { command: 'start_game', description: 'Guruhda o\'yin boshlash (Faqat guruhlar uchun)' },
            { command: 'stop_game', description: 'Guruhda boshlangan o\'yinni to\'xtatish' }
        ]);
        console.log('[Bot] Commands registered successfully');
    } catch (cmdErr) {
        console.error('[Bot] Commands registration failed:', cmdErr);
    }

    bot.launch().then(() => {
        console.log('Telegram bot started');
    }).catch(err => {
        console.error('Bot launch error:', err);
    });

    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
};
