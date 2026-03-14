import { query } from './db';

async function migrate() {
    try {
        console.log('Adding is_active column to duel_quizzes table...');
        await query(`
            ALTER TABLE duel_quizzes 
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
        `);
        console.log('Successfully added is_active column.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        process.exit();
    }
}

migrate();
