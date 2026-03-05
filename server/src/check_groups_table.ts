import { query } from './db';

async function checkTable() {
    try {
        console.log('--- Checking groups table structure ---');
        const res = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'groups'
        `);
        console.log('Columns in groups table:');
        console.dir(res.rows);

        const constraints = await query(`
            SELECT constraint_name, constraint_type
            FROM information_schema.table_constraints
            WHERE table_name = 'groups'
        `);
        console.log('Constraints on groups table:');
        console.dir(constraints.rows);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkTable();
