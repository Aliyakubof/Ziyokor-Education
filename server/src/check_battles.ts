import { query } from './db';

async function check() {
    try {
        const samples = await query('SELECT daraja, level, title FROM vocabulary_battles LIMIT 10');
        console.log('Battle Samples:', samples.rows);
        
        const counts = await query('SELECT daraja, COUNT(*) FROM vocabulary_battles GROUP BY daraja');
        console.log('Counts per Daraja:', counts.rows);
    } catch (e) {
        console.error(e);
    }
}

check();
