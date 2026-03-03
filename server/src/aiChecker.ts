import * as dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || "";

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
        // Reverting to gemini-2.5-flash-lite as even cheaper models (Gemma) are not supported on this endpoint yet
        const modelName = "gemini-2.5-flash-lite";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

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

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API Error (${response.status}): ${errorBody}`);
        }

        const data: any = await response.json();

        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error("Invalid AI response: No candidates found");
        }

        let text = data.candidates[0].content.parts[0].text;

        // Manual JSON extraction as backup/default
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
