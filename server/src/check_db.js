const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const res = await pool.query("SELECT * FROM game_results ORDER BY created_at DESC LIMIT 5");
        for (const row of res.rows) {
            console.log(`\nResult ID: ${row.id}`);
            const players = typeof row.player_results === 'string' ? JSON.parse(row.player_results) : row.player_results;
            for (const p of players) {
                if (p.answers && p.answers['5'] || p.answers['6']) {
                    console.log(`Player ${p.name}`);
                    console.log(`Q5:`, p.answers['4']);
                    console.log(`Q6:`, p.answers['5']); // 0-indexed, so question 6 is index 5
                    console.log(`Q7:`, p.answers['6']);

                    // Let's also check if they got question 6 right or wrong based on aiFeedback
                    if (p.aiFeedbackMap) {
                        console.log("Feedback Q6:", p.aiFeedbackMap['5']);
                    }
                }
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

run();
