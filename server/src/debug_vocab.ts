import { query } from './db';

async function debugVocab() {
    try {
        const result = await query('SELECT title, level, questions FROM unit_quizzes');
        console.log(`Total quizzes: ${result.rowCount}`);

        result.rows.forEach(row => {
            const vocab = row.questions.filter((q: any) => q.type === 'text-input');
            if (vocab.length > 0) {
                console.log(`\n--- Quiz: ${row.title} (Level: ${row.level}) ---`);
                vocab.forEach((q: any) => {
                    console.log(`  Q: "${q.text}" -> Answers: [${q.acceptedAnswers?.join(', ')}]`);
                });
            }
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debugVocab();
