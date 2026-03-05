import { query } from './db';

async function finalize() {
    try {
        console.log('--- Finalizing teacher_id constraint ---');

        // Find current constraint name
        const res = await query(`
            SELECT tc.constraint_name 
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'groups' AND kcu.column_name = 'teacher_id'
        `);

        if (res.rowCount && res.rowCount > 0) {
            const constraintName = res.rows[0].constraint_name;
            console.log(`Found constraint: ${constraintName}. Dropping and recreating as SET NULL...`);
            await query(`ALTER TABLE groups DROP CONSTRAINT ${constraintName}`);
            await query(`ALTER TABLE groups ADD CONSTRAINT ${constraintName} FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL`);
            console.log('Success!');
        } else {
            console.log('No constraint found for teacher_id in groups. Adding one...');
            await query(`ALTER TABLE groups ADD CONSTRAINT groups_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL`);
            console.log('Success!');
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

finalize();
