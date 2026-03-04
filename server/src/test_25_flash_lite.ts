import * as dotenv from 'dotenv';

dotenv.config();

const key = process.env.GEMINI_API_KEY || "";

async function test25FlashLite() {
    console.log("Testing gemini-2.5-flash-lite via REST...");
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${key}`;
        const prompt = "Hello, reply with exactly 'SUCCESS 2.5 FLASH LITE IS ACTIVE' and nothing else.";
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        if (response.ok) {
            console.log("\n✅ AI JAVOBI:");
            console.log(data.candidates[0].content.parts[0].text.trim());
        } else {
            console.error("\n❌ XATOLIK:");
            console.error(JSON.stringify(data, null, 2));
        }
    } catch (e: any) {
        console.error("Tarmoq xatosi:", e.message);
    }
}

test25FlashLite();
