import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export interface AICheckResult {
    isCorrect: boolean;
    contentScore: number; // 0 to 100
    grammarScore: number; // 0 to 100
    feedback: string;
}

export async function checkAnswerWithAI(
    question: string,
    studentAnswer: string,
    questionType: string
): Promise<AICheckResult> {
    if (!apiKey) {
        console.error("GEMINI_API_KEY is not set");
        return { isCorrect: false, contentScore: 0, grammarScore: 0, feedback: "AI checking is currently unavailable." };
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

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

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Extract JSON from response (Gemini sometimes wraps it in markdown blocks)
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                isCorrect: !!parsed.isCorrect,
                grammarScore: Number(parsed.grammarScore) || 0,
                contentScore: Number(parsed.contentScore) || 0,
                feedback: String(parsed.feedback || "")
            };
        }

        throw new Error("Invalid AI response format: " + text);
    } catch (err) {
        console.error("AI Checker Error:", err);
        return { isCorrect: false, contentScore: 0, grammarScore: 0, feedback: "Javobni tekshirishda xatolik yuz berdi." };
    }
}
