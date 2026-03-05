import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'c:/Users/asdov/OneDrive/Desktop/Ziyokor Education/server/.env' });

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
    console.error('TELEGRAM_BOT_TOKEN not found in .env');
    process.exit(1);
}

const bot = new Telegraf(token);

bot.telegram.getMe().then(async me => {
    console.log('Bot info:', me);
    const webhookInfo = await bot.telegram.getWebhookInfo();
    console.log('Webhook info:', webhookInfo);
    process.exit(0);
}).catch(err => {
    console.error('Error fetching bot info:', err.message);
    process.exit(1);
});
