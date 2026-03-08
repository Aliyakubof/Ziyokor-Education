import { query } from './db';

async function migrate() {
    console.log('--- MIGRATION: Persistent AI Cache ---');

    try {
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS ai_responses_cache (
                id SERIAL PRIMARY KEY,
                question_hash TEXT UNIQUE NOT NULL,
                question_text TEXT NOT NULL,
                answer_text TEXT NOT NULL,
                result JSONB NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_ai_cache_hash ON ai_responses_cache(question_hash);
        `;

        await query(createTableQuery);
        console.log('✅ Tables created or already exist.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();
