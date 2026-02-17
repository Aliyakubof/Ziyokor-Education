import { Telegraf } from 'telegraf';
import { query } from './db';

const token = process.env.TELEGRAM_BOT_TOKEN || '8564105202:AAFHcou7QISJjWQe0UQqjPLITIbkZq_2-c4';
export const bot = new Telegraf(token);

// Prevent bot from crashing the server on network errors
bot.catch((err: any, ctx: any) => {
    console.error(`Bot error for ${ctx.updateType}:`, err);
});

const userStates: Record<string, 'awaiting_teacher_phone' | 'awaiting_student_id'> = {};

bot.start(async (ctx) => {
    try {
        const chatId = ctx.chat.id.toString();
        // Check for deep linking payload (e.g., /start 1234567)
        // detailed check to ensure message and text exist
        const text = ctx.message && (ctx.message as any).text ? (ctx.message as any).text : '';
        const payload = text.split(' ')[1];

        if (payload && /^\d{7}$/.test(payload)) {
            console.log(`[Bot] Student login attempt with payload: ${payload} from ${chatId}`);
            await handleStudentLogin(ctx, chatId, payload);
            return;
        }

        console.log(`[Bot] Start command from ${chatId}`);
        ctx.reply(
            'Assalomu alaykum! Ziyokor Education botiga xush kelibsiz.\n' +
            'Iltimos, kim sifatida kirmoqchisiz?',
            {
                reply_markup: {
                    keyboard: [
                        [{ text: "👨‍🏫 Teacher" }, { text: "👨‍🎓 Student" }]
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

bot.hears("👨‍🏫 Teacher", (ctx) => {
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

bot.hears("👨‍🎓 Student", (ctx) => {
    const chatId = ctx.chat.id.toString();
    userStates[chatId] = 'awaiting_student_id';
    ctx.reply(
        'Iltimos, 7 xonali O\'quvchi ID raqamingizni kiriting.',
        {
            reply_markup: { remove_keyboard: true }
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

    if (state === 'awaiting_teacher_phone') {
        let phone = text.replace(/[+\s]/g, '');
        if (!/^\d{9,15}$/.test(phone)) {
            return ctx.reply('❌ Iltimos, to\'g\'ri telefon raqam kiriting.');
        }
        await handleTeacherLogin(ctx, chatId, phone);
        delete userStates[chatId];
    } else if (state === 'awaiting_student_id') {
        if (!/^\d{7}$/.test(text)) {
            return ctx.reply('❌ Iltimos, 7 xonali ID raqam kiriting (faqat raqamlar).');
        }
        await handleStudentLogin(ctx, chatId, text);
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

        // 2. Check subscription count
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
            console.log(`[Bot] Already subscribed to ${student.name}`);
            return ctx.reply(`ℹ️ Siz allaqachon bu o'quvchiga ulangansiz: ${student.name}`, {
                reply_markup: {
                    keyboard: [[{ text: "🚪 Chiqish" }]],
                    resize_keyboard: true
                }
            });
        }

        if (count >= 3) {
            console.log(`[Bot] Subscription limit reached for ${studentId}`);
            return ctx.reply('❌ Bu o\'quvchi profiliga allaqachon 3 ta telegram hisob ulangan. Limit tugagan.');
        }

        // 4. Add subscription
        await query(
            'INSERT INTO student_telegram_subscriptions (student_id, telegram_chat_id) VALUES ($1, $2)',
            [studentId, chatId]
        );

        console.log(`[Bot] Successfully subscribed to ${student.name}`);
        ctx.reply(`✅ Muvaffaqiyatli! Siz O'quvchi profiliga ulandingiz: ${student.name}\nEndi test natijalarini shu yerda olasiz.`, {
            reply_markup: {
                keyboard: [[{ text: "🚪 Chiqish" }]],
                resize_keyboard: true
            }
        });
    } catch (err) {
        console.error('[Bot] Student login error:', err);
        ctx.reply('❌ Tizimda xatolik yuz berdi.');
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
