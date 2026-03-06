import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    console.log('Listing available models...');
    try {
        // The SDK doesn't have a direct listModels method on the main class in all versions, 
        // but we can try to fetch from the API manually if needed.
        // Or we can try a known alternative model name.

        const models = [
            "gemini-1.5-flash",
            "gemini-1.5-flash-8b",
            "gemini-1.0-pro",
            "gemini-1.5-pro"
        ];

        for (const m of models) {
            try {
                const model = genAI.getGenerativeModel({ model: m });
                await model.generateContent("test");
                console.log(`[OK] Model available: ${m}`);
            } catch (err: any) {
                console.log(`[FAIL] Model ${m}: ${err.message}`);
            }
        }

    } catch (err) {
        console.error('List Models Failed:', err);
    }
}

listModels();
