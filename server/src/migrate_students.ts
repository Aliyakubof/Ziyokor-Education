import { query } from './db';

async function updateSchema() {
    try {
        console.log('Adding password column to students table...');

        // Add password column if not exists
        await query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='password') THEN 
                    ALTER TABLE students ADD COLUMN password TEXT; 
                END IF; 
            END $$;
        `);

        console.log('Successfully updated students table schema');
    } catch (err) {
        console.error('Error updating schema:', err);
    }
}

updateSchema();
