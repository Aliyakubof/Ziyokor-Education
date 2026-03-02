const fs = require('fs');
const path = require('path');

const botPath = path.join(__dirname, 'server', 'src', 'bot.ts');
let content = fs.readFileSync(botPath, 'utf8');

const startMarker = "console.error('Potential fail error:', err);\\n        ctx.reply('Xatolik yuz berdi.');\\n    }\\n});";
const endMarker = "async function sendTeacherWeeklyReport(ctx: any, teacherId: string) {";

const replacement = `    } catch (err) {
        console.error('Potential fail error:', err);
        ctx.reply('Xatolik yuz berdi.');
    }
});

// Inline handlers for Manager Potential Fail
bot.action(/^mg_t_(.+)$/, async (ctx) => {
    const teacherId = ctx.match[1];
    try {
        const groups = await query('SELECT id, name FROM groups WHERE teacher_id = $1 ORDER BY name ASC', [teacherId]);
        if (groups.rowCount === 0) return ctx.answerCbQuery('Bu o\\'qituvchida guruhlar yo\\'q.');

        const buttons = groups.rows.map((g: any) => ([{
            text: g.name,
            callback_data: \`mg_g_\${g.id}\`
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
        const students = await query(\`
            SELECT name, coins, last_activity_at 
            FROM students 
            WHERE group_id = $1 
            ORDER BY coins ASC 
            LIMIT 5
        \`, [groupId]);

        if (students.rowCount === 0) return ctx.answerCbQuery('O\\'quvchilar yo\\'q.');

        let msg = \`📉 <b>Guruhdagi eng past ko'rsatkichli o'quvchilar:</b>\\n\\n\`;
        students.rows.forEach((s: any, i: number) => {
            msg += \`\${i + 1}. \${s.name} - \${s.coins} XP\\n\`;
            if (s.last_activity_at) {
                msg += \`   🕒 Oxirgi faollik: \${new Date(s.last_activity_at).toLocaleDateString('uz-UZ')}\\n\`;
            } else {
                msg += \`   🕒 Faollik qayd etilmagan.\\n\`;
            }
        });

        await ctx.editMessageText(msg, { parse_mode: 'HTML' });
    } catch (err) {
        ctx.answerCbQuery('Xatolik.');
    }
});

`;

// Find first occurrence of startMarker and last occurrence (actually there should be one)
const startPos = content.indexOf("console.error('Potential fail error:', err);");
const endPos = content.indexOf(endMarker);

if (startPos !== -1 && endPos !== -1) {
    // Find the end of the line containing }); after startPos
    const closingPos = content.indexOf("});", startPos) + 3;
    content = content.substring(0, startPos - 11) + replacement + content.substring(endPos);
    fs.writeFileSync(botPath, content, 'utf8');
    console.log('Successfully surgical-fixed bot.ts');
} else {
    console.log('Markers not found', startPos, endPos);
}
