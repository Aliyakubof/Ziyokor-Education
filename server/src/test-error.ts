import { query } from './db';
async function run() {
    try {
        const res = await query("SELECT tc.constraint_name, tc.constraint_type FROM information_schema.table_constraints tc WHERE tc.table_name = 'duels'");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch(err: any) {
        console.error(err.message);
    }
    process.exit(0);
}
run();
