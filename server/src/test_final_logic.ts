import { checkAnswerWithAI } from './aiChecker';
import { generateQuizResultPDF } from './pdfGenerator';
import { Player, UnitQuiz } from './types';
import fs from 'fs';

async function testFinal() {
    console.log('--- 1. Testing Gemini AI Logic ---');
    const questionText = "Valeria don't have a part-time job.";
    const playerAnswer = "Valeria doesn't have a part-time job.";
    const acceptedAnswers = ["Valeria does not have a part time job"];

    console.log(`Question: ${questionText}`);
    console.log(`Player Answer: ${playerAnswer}`);
    console.log(`Accepted (Static): ${acceptedAnswers[0]}`);

    const aiResult = await checkAnswerWithAI(questionText, playerAnswer, 'text-input');
    console.log('AI Result:', JSON.stringify(aiResult, null, 2));

    console.log('\n--- 2. Testing PDF Generation Logic ---');
    const mockQuiz: UnitQuiz = {
        id: 'test-quiz',
        level: 'Beginner',
        unit: '1',
        title: 'Beginner Unit 1',
        questions: [
            {
                text: questionText,
                options: [],
                correctIndex: -1,
                timeLimit: 30,
                type: 'text-input',
                acceptedAnswers: acceptedAnswers
            }
        ]
    };

    const mockPlayer: Player = {
        id: 'student1',
        name: 'Test Student',
        score: aiResult.isCorrect ? 1 : 0,
        answers: { '0': playerAnswer },
        status: 'Online',
        partialScoreMap: { 0: aiResult.isCorrect ? 1 : 0 },
        aiFeedbackMap: { 0: aiResult.feedback }
    };

    try {
        const pdfBuffer = await generateQuizResultPDF(mockQuiz, [mockPlayer], 'Test Group');
        fs.writeFileSync('test_final_check.pdf', pdfBuffer);
        console.log('✅ PDF successfully generated: test_final_check.pdf');
        
        if (aiResult.isCorrect) {
            console.log('✅ SUCCESS: Gemini correctly identified the answer and PDF should now respect this.');
        } else {
            console.log('❌ FAILURE: Gemini did not identify the answer as correct.');
        }
    } catch (err) {
        console.error('❌ PDF Generation Error:', err);
    }
}

testFinal();
