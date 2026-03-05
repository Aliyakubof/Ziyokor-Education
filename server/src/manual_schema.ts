import { query } from './db';
import { schema } from './schema';

async function run() {
    const statements = schema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    for (let i = 0; i < statements.length; i++) {
        const s = statements[i];
        try {
            console.log(`Executing statement ${i}: ${s.substring(0, 50)}...`);
            await query(s);
            console.log('Success.');
        } catch (e: any) {
            console.error(`FAILED at statement ${i}:`);
            console.error(s);
            console.error(e.message);
            console.dir(e);
        }
    }
    process.exit();
}
run();
