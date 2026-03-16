import { pool } from './db';
import { v4 as uuidv4 } from 'uuid';

async function main() {
    console.log('Applying available_slots table migration...');
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS available_slots (
                id UUID PRIMARY KEY,
                time_text TEXT NOT NULL,
                day_of_week TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('available_slots table created successfully.');
    } catch (error) {
        console.error('Error creating available_slots table:', error);
    } finally {
        process.exit(0);
    }
}

main();
