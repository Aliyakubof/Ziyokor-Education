import { bot } from './bot';
import { query } from './db';
import { generateQuizResultPDF } from './pdfGenerator';
import * as fs from 'fs';
import * as path from 'path';

async function testSend() {
    console.log('Testing Telegram Bot PDF Sending...');
    try {
        const managerRes = await query("SELECT name, telegram_chat_id FROM teachers WHERE phone = '998947212531'");
        if (!managerRes.rows[0]?.telegram_chat_id) {
            console.error('Manager chat ID not found in DB!');
            return;
        }
        const chatId = managerRes.rows[0].telegram_chat_id;
        console.log(`Found Manager Chat ID: ${chatId}`);

        const mockQuiz: any = { title: 'Test Bot PDF', questions: [{ text: 'Q1', type: 'text-input' }] };
        const mockPlayers: any = [{ name: 'Test Student', score: 1, answers: { 0: 'A' } }];

        console.log('Generating Test PDF...');
        const buffer = await generateQuizResultPDF(mockQuiz, mockPlayers, 'Test Group', 'Test Teacher');
        console.log(`PDF Generated. Size: ${buffer.length} bytes`);

        console.log('Attempting to send document via Telegraf...');
        await bot.telegram.sendDocument(chatId, {
            source: buffer,
            filename: 'test_debug_result.pdf'
        }, {
            caption: '🧪 Test PDF Debug Message',
            parse_mode: 'HTML'
        });
        console.log('✅ PDF successfully sent via Telegram!');
    } catch (err: any) {
        console.error('❌ Failed to send PDF via Telegram:');
        console.error(err);
        if (err.description) console.error('Description:', err.description);
    } finally {
        process.exit(0);
    }
}

testSend();
