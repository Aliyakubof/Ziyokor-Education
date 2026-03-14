import { query } from './db';

async function check() {
    try {
        console.log('Checking columns for table "groups":');
        const res = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'groups'
        `);
        console.table(res.rows);
        
        console.log('\nChecking table "game_results" for JSONB issues:');
        const gr = await query('SELECT player_results FROM game_results LIMIT 10');
        gr.rows.forEach((row, i) => {
            console.log(`Row ${i}: type = ${typeof row.player_results}, isArray = ${Array.isArray(row.player_results)}`);
        });

        process.exit(0);
    } catch (err) {
        console.error('Check failed:', err);
        process.exit(1);
    }
}

check();
