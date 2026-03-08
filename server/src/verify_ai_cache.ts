import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { checkAnswerWithAI } from './aiChecker';
import { query } from './db';

async function verifyCache() {
    console.log('--- VERIFY PERSISTENT CACHE ---');

    const question = "Translate 'Apple' to Uzbek.";
    const studentAnswer = "Olma";
    const type = "translation";

    try {
        // 1. First Call (Should go to AI)
        console.log('Call 1: Sending to AI...');
        const start1 = Date.now();
        const res1 = await checkAnswerWithAI(question, studentAnswer, type);
        const end1 = Date.now();
        console.log(`Call 1 Finished in ${(end1 - start1) / 1000}s. Result: ${res1.isCorrect}`);

        // 2. Check DB directly
        console.log('Checking DB for stored result...');
        const dbCheck = await query('SELECT question_hash, result FROM ai_responses_cache WHERE question_text = $1', [question]);
        if (dbCheck.rowCount! > 0) {
            console.log('✅ Found in DB Cache!');
        } else {
            console.error('❌ NOT found in DB Cache!');
        }

        // 3. Second Call (Should be near-instant from memory/DB)
        console.log('Call 2: Should Hit Cache...');
        const start2 = Date.now();
        const res2 = await checkAnswerWithAI(question, studentAnswer, type);
        const end2 = Date.now();
        const duration2 = (end2 - start2) / 1000;
        console.log(`Call 2 Finished in ${duration2}s. Result: ${res2.isCorrect}`);

        if (duration2 < 0.5) {
            console.log('✅ CACHE HIT SUCCESSFUL!');
        } else {
            console.log('❌ CACHE MISS? Time was too high.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Verification failed:', err);
        process.exit(1);
    }
}

verifyCache();
