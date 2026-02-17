import { query } from './db';

async function updateDb() {
    try {
        await query('ALTER TABLE teachers ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;');
        console.log('Successfully added telegram_chat_id column to teachers table');
    } catch (err) {
        console.error('Error updating database:', err);
    }
}

updateDb();
