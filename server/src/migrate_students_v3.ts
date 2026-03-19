import { query } from './db';

async function migrate() {
    try {
        console.log('--- Migrating Students Table ---');
        
        const columns = [
            { name: 'phone', type: 'TEXT' },
            { name: 'parent_name', type: 'TEXT' },
            { name: 'parent_phone', type: 'TEXT' }
        ];
        
        for (const col of columns) {
            console.log(`Adding column ${col.name} if not exists...`);
            await query(`
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='${col.name}') THEN 
                        ALTER TABLE students ADD COLUMN ${col.name} ${col.type}; 
                    END IF; 
                END $$;
            `);
        }
        
        console.log('✅ Migration successful!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        process.exit(0);
    }
}

migrate();
