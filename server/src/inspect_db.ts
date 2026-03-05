import { query } from './db';

async function inspect() {
    try {
        console.log('--- DB Inspection ---');
        const tables = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        for (const table of tables.rows) {
            const tableName = table.table_name;
            const cols = await query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${tableName}'`);
            console.log(`Table: ${tableName}`);
            console.dir(cols.rows.map(c => c.column_name));
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

inspect();
