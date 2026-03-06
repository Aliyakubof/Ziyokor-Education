import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

export interface AICheckResult {
    isCorrect: boolean;
    contentScore: number; // 0 to 100
    grammarScore: number; // 0 to 100
    feedback: string;
}

import { GoogleGenerativeAI } from "@google/generative-ai";

const getGenAI = () => {
    const apiKey = process.env.GEMINI_API_KEY || "";
    return new GoogleGenerativeAI(apiKey);
};

export async function checkAnswerWithAI(
    question: string,
    studentAnswer: string,
    questionType: string
): Promise<AICheckResult> {
    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
        console.error("GEMINI_API_KEY is not set");
        return { isCorrect: false, contentScore: 0, grammarScore: 0, feedback: "AI checking is currently unavailable." };
    }

    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
        attempt++;
        try {
            const genAI = getGenAI();
            const modelName = process.env.GEMINI_MODEL || "gemma-3-1b-it";
            const model = genAI.getGenerativeModel({ model: modelName });

            const prompt = `
                Siz tajribali, adolatli va til qoidalariga e'tiborli ustozsiz.
                Vazifangiz: Berilgan savolga o'quvchi tomonidan yozilgan javobni tekshirish.

                Baho berish mezonlari:
                1. Faktologik aniqlik (Mantiq): O'quvchining javobi savolga mantiqan va ilmiy tarafdan to'g'ri javob beryaptimi (orqadagi ma'no to'g'ri bo'lishi muhim)?
                2. Grammatika va imlo: Javob imlo va grammatik qoidalarga mos (juda ko'p xatolarsiz) tushunarli yozilganmi?

                Savol: "${question}"
                O'quvchining javobi: "${studentAnswer}"
                Savol turi: "${questionType}"

                Natijani faqat quyidagi qat'iy JSON formatida qaytaring:
                {
                  "isCorrect": boolean,
                  "grammarScore": number,
                  "contentScore": number,
                  "feedback": "string"
                }
            `;

            console.log(`[AI Check] Request for: "${studentAnswer.substring(0, 30)}..." (Attempt ${attempt})`);

            // AI call with a manual timeout via Promise.race
            const aiPromise = model.generateContent(prompt);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("AI_TIMEOUT")), 15000)
            );

            const result = await Promise.race([aiPromise, timeoutPromise]) as any;
            const response = await result.response;
            let text = response.text();

            console.log(`[AI Check] Raw response: ${text}`);

            // Clean up text if AI wrapped it in markdown
            text = text.replace(/```json/g, "").replace(/```/g, "").trim();
            const jsonMatch = text.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                console.log(`[AI Check] Parsed Result: ${parsed.isCorrect ? 'Correct' : 'Incorrect'}`);
                return {
                    isCorrect: !!parsed.isCorrect,
                    grammarScore: Number(parsed.grammarScore) || 0,
                    contentScore: Number(parsed.contentScore) || 0,
                    feedback: String(parsed.feedback || "")
                };
            }
            throw new Error("Invalid AI response format");

        } catch (err: any) {
            console.error(`[AI Check] Attempt ${attempt} failed:`, err.message);
            if (attempt === MAX_RETRIES) {
                return {
                    isCorrect: false,
                    contentScore: 0,
                    grammarScore: 0,
                    feedback: "Javobni tekshirishda xatolik yuz berdi. Iltimos keyinroq urinib ko'ring."
                };
            }
            // Wait before retry (exponential backoff)
            await new Promise(r => setTimeout(r, 1000 * attempt));
        }
    }

    return { isCorrect: false, contentScore: 0, grammarScore: 0, feedback: "Javobni tekshirishda xatolik." };
}

export interface VocabQuestion {
    text: string;
    options: string[];
    correctIndex: number;
}

export async function generateVocabBattleWithAI(
    level: string,
    candidates: any[],
    count: number = 15
): Promise<VocabQuestion[]> {
    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set");
    }

    try {
        const genAI = getGenAI();
        const modelName = process.env.GEMINI_MODEL || "gemma-3-1b-it";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const prompt = `
            Vazifangiz: O'quvchilar uchun "Lug'at Battle" o'yini savollarini yaratish.
            O'quvchi darajasi: ${level}
            Talab qilinadigan savollar soni: ${count}
            
            Sizga bazadan olingan xomaki savollar (candidates) beriladi. Ulardan foydalanib:
            1. Har bir so'zni tahlil qiling. Faqatgina vocabulary (so'z yoki ibora) bo'lsin, uzun gaplar bo'lmasin.
            2. Tarjima "Cambridge Dictionary" va "Oxford" standartlariga mos, 100% aniq bo'lsin (Inglizcha -> O'zbekcha yo'nalishida).
            3. Har bir savol uchun 3 ta mantiqan yaqin, lekin noto'g'ri (distractors) variantlar yarating.
            4. Variantlar faqat o'zbek tilida bo'lsin.
            5. Agar berilgan xomaki savollar kam bo'lsa yoki sifatsiz bo'lsa, o'zingiz darajaga mos yangi so'zlar qo'shing.

            Berilgan xomaki savollar (ba'zilarida xatolar bo'lishi mumkin):
            ${JSON.stringify(candidates.slice(0, 50))}

            Natijani faqat quyidagi JSON formatida qaytaring:
            {
              "questions": [
                {
                  "text": "English word",
                  "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
                  "correctIndex": number (0 to 3)
                }
              ]
            }
        `;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API Error (${response.status}): ${errorBody}`);
        }

        const data: any = await response.json();
        const text = data.candidates[0].content.parts[0].text;
        const parsed = JSON.parse(text);

        return parsed.questions || [];

    } catch (err) {
        console.error("AI Generation Error:", err);
        throw err;
    }
}
