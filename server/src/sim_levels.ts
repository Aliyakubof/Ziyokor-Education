import { query } from './db';

async function simulate(studentId: string) {
    try {
        console.log('--- Simulating for Student:', studentId);
        
        const studentRes = await query(`
            SELECT s.id, s.name, g.level as daraja 
            FROM students s 
            JOIN groups g ON s.group_id = g.id 
            WHERE s.id = $1
        `, [studentId]);

        if (studentRes.rowCount === 0) {
            console.log('Error: Student or group not found');
            return;
        }
        const daraja = studentRes.rows[0].daraja;
        console.log('Found Student Daraja:', daraja);

        const result = await query(
            'SELECT level, title FROM vocabulary_battles WHERE daraja = $1 ORDER BY level ASC',
            [daraja]
        );
        console.log('Battles found:', result.rowCount);

        const historyRes = await query(`
            SELECT 
                gr.quiz_title, 
                (p->>'score')::int as score, 
                gr.total_questions
            FROM game_results gr
            CROSS JOIN LATERAL jsonb_array_elements(
                CASE WHEN jsonb_typeof(gr.player_results) = 'array' THEN gr.player_results ELSE '[]'::jsonb END
            ) AS p
            WHERE gr.quiz_title LIKE $2 
              AND p->>'id' = $1
        `, [studentId, `Vocab Battle: ${daraja} - Level %`]);
        console.log('History records found:', historyRes.rowCount);

    } catch (e: any) {
        console.error('Simulation FAILED:', e.message);
    }
}

async function run() {
    const students = await query('SELECT id FROM students LIMIT 1');
    if (students.rows.length > 0) {
        await simulate(students.rows[0].id);
    } else {
        console.log('No students found to test.');
    }
    process.exit(0);
}

run();
