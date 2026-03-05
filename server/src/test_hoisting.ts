import { bot } from './bot';
import dotenv from 'dotenv';

console.log('Is TELEGRAM_BOT_TOKEN set before dotenv.config() in test script?', !!process.env.TELEGRAM_BOT_TOKEN);
dotenv.config();
console.log('Is TELEGRAM_BOT_TOKEN set after dotenv.config() in test script?', !!process.env.TELEGRAM_BOT_TOKEN);
console.log('Bot token in bot instance (secret part):', (bot as any).token.split(':')[0]);
