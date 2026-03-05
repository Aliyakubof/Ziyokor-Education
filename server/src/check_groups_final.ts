import { query } from './db';

async function check() {
    const res = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'groups'");
    console.log('Columns in groups:');
    res.rows.forEach(r => console.log(`- ${r.column_name}`));
    process.exit();
}
check();
