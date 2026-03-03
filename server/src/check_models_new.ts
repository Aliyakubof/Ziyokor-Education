
import * as dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const key = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(key);

async function checkModels() {
    console.log("Checking API Key:", key.substring(0, 10) + "...");
    try {
        // Test a very basic model that is usually available
        const modelNames = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
        for (const name of modelNames) {
            try {
                const model = genAI.getGenerativeModel({ model: name });
                const result = await model.generateContent("test");
                console.log(`✅ Model ${name} is WORKING.`);
                return;
            } catch (e: any) {
                console.log(`❌ Model ${name} failed: ${e.message}`);
            }
        }
    } catch (err: any) {
        console.error("General Error:", err.message);
    }
}

checkModels();
