import * as dotenv from 'dotenv';
import path from 'path';
import { checkAnswersWithAIBatch } from './aiChecker';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function runStressTest() {
    console.log('🚀 Gemini Stress Test boshlandi (150 ta savol)...');

    // 150 ta savol: Bu safar o'quvchi javoblari TO'G'RI yoki juda yaqin (sinonim/qisqartma)
    const testQuestions = [];

    const categories = [
        {
            type: 'rewrite',
            prompt: 'Passive Voice: ',
            q: 'People speak English all over the world.',
            a: 'English is spoken all over the world.',
            student: 'English is spoken all over the world' // To'liq to'g'ri
        },
        {
            type: 'rewrite',
            prompt: 'Reported Speech: ',
            q: '\"I am happy,\" she said.',
            a: 'She said she was happy.',
            student: 'She said that she was happy' // "that" qo'shilgan, to'g'ri variant
        },
        {
            type: 'fill-blank',
            prompt: 'Fill blanks: ',
            q: 'She [...] (go) to the cinema yesterday.',
            a: 'went',
            student: 'went' // To'liq to'g'ri
        },
        {
            type: 'find-mistake',
            prompt: 'Find and fix: ',
            q: 'He have a car.',
            a: 'He has a car.',
            student: 'He has a car' // To'g'rilangan variant
        },
        {
            type: 'text-input',
            prompt: 'Synonym of: ',
            q: 'Difficult',
            a: 'Hard',
            student: 'Challenging' // Sinonim, Gemini buni to'g'ri deyishi kerak
        }
    ];

    for (let i = 0; i < 150; i++) {
        const cat = categories[i % categories.length];
        testQuestions.push({
            text: `${cat.prompt}${cat.q} (Test #${i + 1})`,
            studentAnswer: cat.student,
            type: cat.type,
            acceptedAnswers: [cat.a]
        });
    }

    const startTime = Date.now();
    try {
        console.log(`[Test] Processing ${testQuestions.length} questions in batches...`);
        const results = await checkAnswersWithAIBatch(testQuestions);
        const endTime = Date.now();

        const correctCount = results.filter(r => r.isCorrect).length;
        const duration = (endTime - startTime) / 1000;

        console.log('\n--- STRESS TEST NATIJALARI ---');
        console.log(`Jami savollar: ${testQuestions.length}`);
        console.log(`To'g'ri topildi: ${correctCount}`);
        console.log(`Xato topildi: ${testQuestions.length - correctCount}`);
        console.log(`Aniqik: ${((correctCount / testQuestions.length) * 100).toFixed(2)}%`);
        console.log(`Sarflangan vaqt: ${duration} soniya`);
        console.log(`Har bir savol uchun o'rtacha vaqt: ${(duration / testQuestions.length).toFixed(3)}s`);

        // Oxirgi 3 ta natijani namunaviy ko'rsatish
        console.log('\n--- Namunaviy Javoblar (Oxirgi 3 ta): ---');
        results.slice(-3).forEach((r, i) => {
            const idx = 150 - 3 + i;
            console.log(`Savol #${idx + 1}: [Correct: ${r.isCorrect}] Feedback: ${r.feedback}`);
        });

    } catch (err: any) {
        console.error('❌ Test davomida xatolik:', err.message);
    }
}

runStressTest();
