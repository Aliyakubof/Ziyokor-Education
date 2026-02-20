import { query } from './db';
import * as dotenv from 'dotenv';
dotenv.config();

async function migrate() {
    console.log('🔄 Migration started...');
    try {
        // 1. Update Groups table: Add level
        console.log('Updating Groups table...');
        await query(`ALTER TABLE groups ADD COLUMN IF NOT EXISTS level TEXT NOT NULL DEFAULT 'Beginner';`);

        // 2. Update Students table: Add gamification fields
        console.log('Updating Students table...');
        await query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS coins INT DEFAULT 0;`);
        await query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS streak_count INT DEFAULT 0;`);
        await query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;`);
        await query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS avatar_url TEXT;`);

        // 3. Create Student Purchases table
        console.log('Creating Student Purchases table...');
        await query(`
            CREATE TABLE IF NOT EXISTS student_purchases (
                id UUID PRIMARY KEY,
                student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
                item_type TEXT NOT NULL,
                item_id TEXT NOT NULL,
                purchased_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // 4. Create Duels table
        console.log('Creating Duels table...');
        await query(`
            CREATE TABLE IF NOT EXISTS duels (
                id UUID PRIMARY KEY,
                player1_id TEXT REFERENCES students(id) ON DELETE CASCADE,
                player2_id TEXT REFERENCES students(id) ON DELETE CASCADE,
                quiz_id UUID REFERENCES unit_quizzes(id) ON DELETE CASCADE,
                player1_score INT DEFAULT 0,
                player2_score INT DEFAULT 0,
                winner_id TEXT,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        console.log('✅ Migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        process.exit();
    }
}

migrate();
