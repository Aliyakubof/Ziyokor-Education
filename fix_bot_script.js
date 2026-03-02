const fs = require('fs');
const path = require('path');

const botPath = path.join(__dirname, 'server', 'src', 'bot.ts');
let content = fs.readFileSync(botPath, 'utf8');

// The corrupted block starts around "172: async function isManager" 
// and ends around "244: 233: });"

const newSection = `async function isManager(chatId: string) {
    const res = await query('SELECT * FROM teachers WHERE telegram_chat_id = $1 AND REPLACE(phone, \\'+\\', \\'\\') = $2', [chatId, MANAGER_PHONE]);
    return (res.rowCount || 0) > 0;
}

bot.hears('📊 Haftalik Hisobot', async (ctx) => {
    const chatId = ctx.chat?.id.toString();
    if (!chatId || !await isManager(chatId)) return;

    try {
        const teachers = await query(\`
            SELECT DISTINCT t.id, t.name 
            FROM teachers t
            JOIN groups g ON t.id = g.teacher_id
            WHERE t.id NOT IN ($1, $2) 
            ORDER BY t.name ASC\`, 
            ['00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001']
        );
        if (teachers.rowCount === 0) return ctx.reply('Faol o\\'qituvchilar topilmadi.');

        const buttons = teachers.rows.map((t: any) => ([{
            text: t.name,
            callback_data: \`mg_rep_\${t.id}\`
        }]));

        ctx.reply('📊 Hisobot uchun o\\'qituvchini tanlang:', {
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
        const teachers = await query(\`
            SELECT DISTINCT t.id, t.name 
            FROM teachers t
            JOIN groups g ON t.id = g.teacher_id
            WHERE t.id NOT IN ($1, $2) 
            ORDER BY t.name ASC\`, 
            ['00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001']
        );
        if (teachers.rowCount === 0) return ctx.reply('Faol o\\'qituvchilar topilmadi.');

        const buttons = teachers.rows.map((t: any) => ([{
            text: t.name,
            callback_data: \`mg_t_\${t.id}\`
        }]));

        ctx.reply('📉 Potentional fail uchung o\\'qituvchini tanlang:', {
            reply_markup: { inline_keyboard: buttons }
        });
    } catch (err) {
        console.error('Potential fail error:', err);
        ctx.reply('Xatolik yuz berdi.');
    }
});`;

// We need to find the start and end of the corrupted block in the raw file.
// The block starts with "172: async function isManager" and ends with "233: });" followed by some empty lines.

// Let's use a very broad replacement if we can identify the boundaries.
// Or we can just use regex to clean up the whole file if there are other line numbers injected.
// But it seems only that block was affected.

const lines = content.split('\\n');
let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('172: async function isManager')) {
        startIdx = i;
    }
    if (startIdx !== -1 && lines[i].includes('233: });')) {
        endIdx = i;
    }
}

if (startIdx !== -1 && endIdx !== -1) {
    lines.splice(startIdx, endIdx - startIdx + 1, newSection);
    fs.writeFileSync(botPath, lines.join('\\n'), 'utf8');
    console.log('Successfully fixed bot.ts');
} else {
    console.error('Could not find the corrupted block boundaries');
    console.log('startIdx:', startIdx, 'endIdx:', endIdx);
}
