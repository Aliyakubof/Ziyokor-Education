import { generateQuizResultPDF } from './pdfGenerator';
import { Player, UnitQuiz } from './types';
import * as fs from 'fs';
import * as path from 'path';

const mockQuiz: UnitQuiz = {
    id: 'test-quiz-id',
    title: 'Kirill Alifbosi Testi (Кирилл Айтиши)',
    level: 'Beginner',
    unit: '1',
    questions: [
        {
            text: 'Salom dunyo! (Привет мир!)',
            type: 'text-input',
            options: [],
            acceptedAnswers: ['Salom dunyo', 'Привет мир'],
            timeLimit: 30,
            correctIndex: -1
        }
    ]
};

const mockPlayers: Player[] = [
    {
        id: 'p1',
        name: 'Ali Yakubov (Али Якубов)',
        score: 1,
        answers: { 0: 'Привет мир' },
        partialScoreMap: { 0: 1 }
    }
];

async function runTest() {
    console.log('Generating PDF with Cyrillic characters...');
    try {
        const buffer = await generateQuizResultPDF(mockQuiz, mockPlayers, 'Guruh 1 (Группа 1)');
        const outputPath = path.join(__dirname, 'test_result_cyrillic.pdf');
        fs.writeFileSync(outputPath, buffer);
        console.log(`PDF generated successfully at: ${outputPath}`);
        console.log('Please inspect the file to ensure Cyrillic characters are visible and there are no "?" characters.');
    } catch (err) {
        console.error('PDF Generation Failed:', err);
    }
}

runTest();
