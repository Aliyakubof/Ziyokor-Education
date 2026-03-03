
import * as dotenv from 'dotenv';
dotenv.config();

const key = process.env.GEMINI_API_KEY || "";

async function quickTest() {
    const models = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-pro-latest", "gemini-2.0-flash-lite"];
    for (const modelName of models) {
        console.log(`Testing ${modelName}...`);
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: "Respond only with 'OK'" }] }]
                })
            });
            if (response.ok) {
                const data: any = await response.json();
                console.log(`✅ ${modelName} is working:`, data.candidates[0].content.parts[0].text);
                process.exit(0);
            } else {
                const errText = await response.text();
                console.log(`❌ ${modelName} failed: ${response.status} - ${errText.substring(0, 100)}...`);
            }
        } catch (e: any) {
            console.log(`❌ ${modelName} error: ${e.message}`);
        }
    }
}

quickTest();
