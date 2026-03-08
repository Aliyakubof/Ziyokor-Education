
import { query } from './src/db';
import { v4 as uuidv4 } from 'uuid';

async function testJsonFix() {
    console.log('--- Testing JSON Format Handling ---');
    const id = uuidv4();
    const questions = [{ text: "Test Q", options: ["A", "B"], correctIndex: 0 }];

    // Simulate current app.ts logic for saving
    const questionsToSave = Array.isArray(questions) ? JSON.stringify(questions) : questions;

    try {
        await query(
            'INSERT INTO unit_quizzes (id, title, questions, level, unit) VALUES ($1, $2, $3, $4, $5)',
            [id, 'Test Quiz JSON Fix', questionsToSave, 'Beginner', '1']
        );

        const res = await query('SELECT questions FROM unit_quizzes WHERE id = $1', [id]);
        const retrieved = res.rows[0].questions;

        console.log('Retrieved type from PG:', typeof retrieved);
        console.log('Retrieved content:', retrieved);

        // Final verification for server logic:
        let finalQuestions = retrieved;
        if (typeof finalQuestions === 'string') {
            finalQuestions = JSON.parse(finalQuestions);
            console.log('Successfully parsed string from DB');
        }

        if (Array.isArray(finalQuestions) && finalQuestions.length > 0) {
            console.log('PASSED: Questions are correctly handled and parsed.');
        } else {
            console.log('FAILED: Questions format is incorrect.');
        }

        // Cleanup
        await query('DELETE FROM unit_quizzes WHERE id = $1', [id]);

    } catch (err) {
        console.error('Test error:', err);
    }
}

testJsonFix().then(() => process.exit(0));
