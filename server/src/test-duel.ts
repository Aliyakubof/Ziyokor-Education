import { query } from './db';
import { v4 as uuidv4 } from 'uuid';

async function run() {
    try {
        const student1Res = await query('SELECT id FROM students LIMIT 1');
        const student2Res = await query('SELECT id FROM students OFFSET 1 LIMIT 1');
        const quizRes = await query('SELECT id FROM duel_quizzes ORDER BY created_at DESC LIMIT 1');
        
        if (!student1Res.rowCount || !student2Res.rowCount) {
            console.log("Missing students.");
            return;
        }
        if (!quizRes.rowCount) {
            console.log("Missing duel quizzes.");
            return;
        }
        
        const s1 = student1Res.rows[0].id;
        const s2 = student2Res.rows[0].id;
        const qId = quizRes.rows[0].id;
        
        console.log(`Inserting duel: p1=${s1}, p2=${s2}, q=${qId}`);
        const duelId = uuidv4();
        await query('INSERT INTO duels (id, player1_id, player2_id, quiz_id, status) VALUES ($1, $2, $3, $4, $5)', [duelId, s1, s2, qId, 'active']);
        console.log("Insert success!");
        
        // Clean up
        await query('DELETE FROM duels WHERE id = $1', [duelId]);
    } catch(err: any) {
        console.error("SQL Error:", err.message, err);
    }
    process.exit(0);
}
run();
