const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function migrate() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        
        console.log('Ensuring duel_quizzes table exists...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS duel_quizzes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                daraja TEXT NOT NULL,
                title TEXT NOT NULL,
                questions JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('duel_quizzes table is ready.');

        console.log('Adding is_active column if missing...');
        await client.query(`
            ALTER TABLE duel_quizzes 
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
        `);
        console.log('is_active column is ready.');

    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await client.end();
        process.exit();
    }
}

migrate();
