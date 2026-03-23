import { query } from './db';
import fs from 'fs';
import path from 'path';

async function run() {
    try {
        const res = await query("SELECT tc.constraint_name, tc.constraint_type, kcu.column_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name WHERE tc.table_name = 'duels'");
        fs.writeFileSync(path.join(__dirname, 'constraints.json'), JSON.stringify(res.rows, null, 2));
    } catch(err: any) {
        fs.writeFileSync(path.join(__dirname, 'constraints.json'), JSON.stringify({error: err.message}));
    }
    process.exit(0);
}
run();
