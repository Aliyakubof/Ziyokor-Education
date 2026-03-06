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
        return { isCorrect: false, contentScore: 0, grammarScore: 0, feedback: "AI tekshiruv vaqtincha mavjud emas." };
    }

    // Fail-fast for empty answers
    if (!studentAnswer || studentAnswer.trim().length < 2) {
        return { isCorrect: false, contentScore: 0, grammarScore: 0, feedback: "Javob bo'sh yoki juda qisqa." };
    }

    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
        attempt++;
        try {
            const genAI = getGenAI();
            const modelName = process.env.GEMINI_MODEL || "gemma-3-1b-it";
            const model = genAI.getGenerativeModel({ model: modelName });

            const prompt = `Siz tajribali o'zbek tili va ingliz tili o'qituvchisisiz. Berilgan savolga o'quvchi javobini baholang.

MUHIM QOIDALAR:
1. Javobning MA'NO va MAZMUNI asosiy mezon. Imlo xatolari yoki grammatik kamchiliklar YAGONA sabab bo'lib, javobni noto'g'ri deb hisoblash mumkin emas.
2. Javob o'zbek, rus yoki ingliz tilida bo'lishi mumkin - bu normaldur.
3. Agar javob savolning asosiy ma'nosiga mos kelsa va tushunish mumkin bo'lsa, u TO'G'RI.
4. Faqat savol bilan mutlaqo bog'liq bo'lmagan yoki noto'g'ri ma'noli javobni noto'g'ri deb belgilang.
5. To'liq emas, lekin to'g'ri yo'naltirilgan javobga contentScore 50-80 bering.

Savol turi: "${questionType}"
Savol: "${question}"
O'quvchi javobi: "${studentAnswer}"

Faqat quyidagi JSON formatida javob bering (boshqa hech narsa yozmang):
{"isCorrect": boolean, "grammarScore": number (0-100), "contentScore": number (0-100), "feedback": "O'zbekcha qisqa izoh"}`;

            console.log(`[AI Check] Request for: "${studentAnswer.substring(0, 30)}..." (Attempt ${attempt})`);

            const aiPromise = model.generateContent(prompt);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("AI_TIMEOUT")), 15000)
            );

            const result = await Promise.race([aiPromise, timeoutPromise]) as any;
            const response = await result.response;
            let text = response.text();

            console.log(`[AI Check] Raw response: ${text}`);

            text = text.replace(/```json/g, "").replace(/```/g, "").trim();
            const jsonMatch = text.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                console.log(`[AI Check] Parsed Result: ${parsed.isCorrect ? 'Correct' : 'Incorrect'} (content: ${parsed.contentScore})`);
                return {
                    isCorrect: !!parsed.isCorrect,
                    grammarScore: Math.min(100, Math.max(0, Number(parsed.grammarScore) || 0)),
                    contentScore: Math.min(100, Math.max(0, Number(parsed.contentScore) || 0)),
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
