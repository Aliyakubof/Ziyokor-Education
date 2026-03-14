import { query } from './db';

async function check() {
    try {
        const res = await query('SELECT quiz_title, player_results FROM game_results ORDER BY created_at DESC LIMIT 10');
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    }
}


check();
