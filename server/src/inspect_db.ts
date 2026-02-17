import { query } from './db';

async function inspectTable() {
    try {
        const result = await query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'teachers';
        `);
        console.table(result.rows);
    } catch (err) {
        console.error('Error inspecting table:', err);
    }
}

inspectTable();
