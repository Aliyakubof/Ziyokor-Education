import * as dotenv from 'dotenv';
import path from 'path';
import { checkAnswersWithAIBatch } from './aiChecker';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function runStressTest() {
    console.log('🚀 Gemini Stress Test boshlandi (150 ta savol)...');

    // 150 ta turli xil savollar (bu yerda namunaviy 150 ta savol shakllantiriladi)
    const testQuestions = [];

    // Qiyin grammatik mavzular: Conditionals, Passive Voice, Reported Speech, Perfect tenses
    const categories = [
        { type: 'rewrite', prompt: 'Rewrite to Passive: ', q: 'The government is building a new bridge.', a: 'A new bridge is being built by the government.', student: 'New bridge is being built' },
        { type: 'rewrite', prompt: 'Rewrite to Reported Speech: ', q: '\"I will call you tomorrow,\" he said.', a: 'He said he would call me the next day.', student: 'He said he\u2019d call me tomorrow' },
        { type: 'fill-blank', prompt: 'Fill in the blank: ', q: 'If I [...] (see) him, I would have told him.', a: 'had seen', student: 'seen' },
        { type: 'find-mistake', prompt: 'Find mistake: ', q: 'He don\'t know where is the keys.', a: 'He doesn\'t know where the keys are.', student: 'He doesn\u2019t know where the keys are.' },
        { type: 'text-input', prompt: 'Explain the meaning of: ', q: 'Break a leg', a: 'Good luck', student: 'Wish me luck' }
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
