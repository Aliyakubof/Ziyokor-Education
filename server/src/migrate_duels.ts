import { query } from './db';

async function migrate() {
    try {
        console.log('Creating duel_quizzes table...');
        await query(`
            CREATE TABLE IF NOT EXISTS duel_quizzes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                daraja TEXT NOT NULL,
                title TEXT NOT NULL,
                questions JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Successfully created duel_quizzes table.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        process.exit();
    }
}

migrate();
