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
        const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
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
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set");
    }

    try {
        const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
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
