import { query } from './db';

async function main() {
    try {
        console.log('Finding foreign key constraints for groups table...');
        const res = await query(`
            SELECT
                tc.constraint_name,
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name,
                rc.delete_rule
            FROM
                information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
                JOIN information_schema.referential_constraints AS rc
                  ON tc.constraint_name = rc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='groups';
        `);
        console.dir(res.rows, { depth: null });

        let fkeyName = '';
        for (let row of res.rows) {
            if (row.column_name === 'teacher_id') {
                fkeyName = row.constraint_name;
            }
        }

        if (fkeyName) {
            console.log(`Dropping constraint ${fkeyName} and adding it back with ON DELETE SET NULL...`);
            await query(`ALTER TABLE groups DROP CONSTRAINT ${fkeyName}`);
            await query(`ALTER TABLE groups ADD CONSTRAINT ${fkeyName} FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL`);
            console.log('Successfully updated constraint.');
        } else {
            console.log('Could not find existing foreign key for teacher_id on groups table.');
        }

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

main();
