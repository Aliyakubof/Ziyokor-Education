
import * as dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const key = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(key);

async function listModels() {
    console.log("Listing models for key:", key.substring(0, 7) + "...");
    try {
        // There isn't a direct listModels in the *current* simple SDK, 
        // but we can try to use a known working model.
        // Actually, the error suggested calling ListModels.
        // In @google/generative-ai, we might need to use the REST API or another way.

        const modelsToTest = [
            "gemini-2.5-flash",
            "gemini-2.5-flash-lite",
            "gemma-3-1b-it"
        ];
        for (const modelName of modelsToTest) {
            console.log(`\nTesting model: ${modelName}`);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hi");
                const response = await result.response;
                console.log(`${modelName} Success:`, response.text());
                break; // Stop if one works
            } catch (err: any) {
                console.log(`${modelName} Failed:`, err.message || err);
            }
        }
    } catch (err: any) {
        console.log("Error:", err.message || err);
    }
}

listModels();
