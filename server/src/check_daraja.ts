import { query } from './db';

async function check() {
    try {
        const studentRes = await query(`
            SELECT s.id, s.name, g.level as daraja 
            FROM students s 
            JOIN groups g ON s.group_id = g.id 
            LIMIT 5
        `);
        console.log('Students and their daraja:', studentRes.rows);

        const battles = await query('SELECT daraja, COUNT(*) FROM vocabulary_battles GROUP BY daraja');
        console.log('Battles counts:', battles.rows);
    } catch (e: any) {
        console.error('Check failed:', e.message);
    }
}

check();
