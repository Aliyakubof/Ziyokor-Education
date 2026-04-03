import { query } from './db';

async function check() {
    try {
        const res = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('Tables:', res.rows.map(r => r.table_name));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

check();
