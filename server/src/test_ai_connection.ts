import * as dotenv from 'dotenv';
import path from 'path';
import { checkAnswerWithAI } from './aiChecker';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testAI() {
    console.log("--- AI Tekshirish Testi Boshlandi ---");
    
    const testCases = [
        {
            q: "Apple qanday tarjima qilinadi?",
            a: "olma",
            type: "text-input"
        },
        {
            q: "What is the capital of France?",
            a: "paris",
            type: "text-input"
        },
        {
            q: "Bo'shliqlar bilan test: 'apple pie'",
            a: "applepie",
            type: "text-input"
        }
    ];

    for (const test of testCases) {
        console.log(`\nSavol: ${test.q}`);
        console.log(`O'quvchi javobi: "${test.a}"`);
        
        try {
            const result = await checkAnswerWithAI(test.q, test.a, test.type);
            console.log("Natija:");
            console.log(`  - To'g'rimi: ${result.isCorrect}`);
            console.log(`  - Content Ball: ${result.contentScore}`);
            console.log(`  - Feedback: ${result.feedback}`);
        } catch (err: any) {
            console.error(`  - Xatolik: ${err.message}`);
        }
    }
    
    console.log("\n--- Test Yakunlandi ---");
}

testAI();
