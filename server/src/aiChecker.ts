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
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
              "isCorrect": boolean (agar hammayoq to'g'ri bo'lsa true, umuman chalg'igan yoki juda xato yozgan bo'lsa false),
              "grammarScore": number (0 dan 100 gacha, gramatikasi qanday),
              "contentScore": number (0 dan 100 gacha, mantiqi/fakti qanday),
              "feedback": "string (O'quvchiga qisqacha o'zbek tilida izoh: nima to'g'ri, nima xato, qayerda imlo xatosi borligini ko'rsating)"
            }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Extract JSON from response (Gemini sometimes wraps it in markdown)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        throw new Error("Invalid AI response format");
    } catch (err) {
        console.error("AI Checker Error:", err);
        return { isCorrect: false, contentScore: 0, grammarScore: 0, feedback: "Javobni tekshirishda xatolik yuz berdi." };
    }
}
