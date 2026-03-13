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
        console.log('Adding is_active column to duel_quizzes table...');
        await client.query(`
            ALTER TABLE duel_quizzes 
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
        `);
        console.log('Successfully added is_active column.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await client.end();
        process.exit();
    }
}

migrate();
