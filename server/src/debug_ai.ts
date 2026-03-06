import { checkAnswerWithAI } from './aiChecker';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env from server directory
dotenv.config({ path: path.join(__dirname, '../.env') });

async function debugAI() {
    console.log('Testing AI Checker with SDK...');

    const tests = [
        {
            q: "What is your favorite book and why?",
            a: "My favorite book is '1984' by George Orwell because it explores the dangers of totalitarianism.",
            type: "text-input"
        },
        {
            q: "Moshina so'zini inglizchaga tarjima qiling.",
            a: "A car is a vehicle with four wheels.",
            type: "text-input"
        }
    ];

    for (const test of tests) {
        console.log(`\nTesting question: "${test.q}"`);
        console.log(`Student answer: "${test.a}"`);

        try {
            const result = await checkAnswerWithAI(test.q, test.a, test.type);
            console.log('Result:', JSON.stringify(result, null, 2));
        } catch (err) {
            console.error('AI Check Failed:', err);
        }
    }
}

debugAI();
