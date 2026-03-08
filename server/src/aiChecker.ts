import * as dotenv from 'dotenv';
import path from 'path';
import { query } from './db';
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

export interface AIBatchCheckResult {
    results: AICheckResult[];
}

const aiCache = new Map<string, AICheckResult>();

function getCacheKey(question: string, answer: string): string {
    return `${question.trim().toLowerCase()}|||${answer.trim().toLowerCase()}`;
}

export async function checkAnswersWithAIBatch(
    questions: { text: string, studentAnswer: string, type: string, acceptedAnswers?: string[] }[]
): Promise<AICheckResult[]> {
    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
        return questions.map(() => ({ isCorrect: false, contentScore: 0, grammarScore: 0, feedback: "AI tekshiruv vaqtincha mavjud emas." }));
    }

    if (questions.length === 0) return [];

    const finalResults: AICheckResult[] = new Array(questions.length);
    const pendingQuestions: { text: string, studentAnswer: string, type: string, originalIndex: number }[] = [];

    // 1. Check Local Memory Cache First
    const keysToDb: { key: string, originalIndex: number }[] = [];
    questions.forEach((q, i) => {
        const key = getCacheKey(q.text, q.studentAnswer);
        if (aiCache.has(key)) {
            finalResults[i] = aiCache.get(key)!;
        } else {
            keysToDb.push({ key, originalIndex: i });
        }
    });

    if (keysToDb.length > 0) {
        // 2. Check Database Cache
        console.log(`[AI Cache] Checking DB for ${keysToDb.length} questions...`);
        const hashes = keysToDb.map(k => k.key);
        try {
            const dbRes = await query(
                'SELECT question_hash, result FROM ai_responses_cache WHERE question_hash = ANY($1)',
                [hashes]
            );

            const dbMap = new Map<string, AICheckResult>();
            dbRes.rows.forEach(row => {
                dbMap.set(row.question_hash, row.result as AICheckResult);
            });

            keysToDb.forEach(item => {
                if (dbMap.has(item.key)) {
                    const result = dbMap.get(item.key)!;
                    finalResults[item.originalIndex] = result;
                    aiCache.set(item.key, result); // Sync to memory cache
                } else {
                    const q = questions[item.originalIndex];
                    pendingQuestions.push({ ...q, originalIndex: item.originalIndex });
                }
            });
        } catch (err) {
            console.error('[AI Cache] DB Lookup Error:', err);
            // Fallback: treat all as pending
            keysToDb.forEach(item => {
                const q = questions[item.originalIndex];
                pendingQuestions.push({ ...q, originalIndex: item.originalIndex });
            });
        }
    }

    if (pendingQuestions.length === 0) return finalResults;

    console.log(`[AI Batch Check] ${questions.length} total, ${pendingQuestions.length} unique/new questions to check.`);

    // 2. Process Unique Questions in Chunks
    // Chunk size 10: fewer API calls for large batches (e.g. 1120 questions = 112 chunks vs 224)
    const CHUNK_SIZE = 10;
    const chunks: { text: string, studentAnswer: string, type: string, originalIndex: number }[][] = [];
    for (let i = 0; i < pendingQuestions.length; i += CHUNK_SIZE) {
        chunks.push(pendingQuestions.slice(i, i + CHUNK_SIZE));
    }

    console.log(`[AI Batch Check] Processing ${pendingQuestions.length} questions in ${chunks.length} chunks (Parallel Pool)...`);

    const allResultsRaw: (AICheckResult[] | null)[] = new Array(chunks.length).fill(null);

    // Concurrency pool: 2 parallel chunks max to avoid quota errors when 3-4 groups run simultaneously
    const CONCURRENCY_LIMIT = 2;
    const chunkIndices = [...Array(chunks.length).keys()];

    async function processChunk(idx: number) {
        const chunk = chunks[idx];
        const MAX_RETRIES = 3;
        let attempt = 0;

        while (attempt < MAX_RETRIES) {
            attempt++;
            try {
                const genAI = getGenAI();
                const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";
                const model = genAI.getGenerativeModel({ model: modelName });

                const batchInfo = chunk.map((q: any, i: number) => {
                    const correctHint = q.acceptedAnswers && q.acceptedAnswers.length > 0
                        ? `\nTo'g'ri javob(lar): ${q.acceptedAnswers.join(' | ')}`
                        : '';
                    return `SAVOL #${i + 1}:\nTur: ${q.type}\nSavol: ${q.text}${correctHint}\nO'quvchi javobi: ${q.studentAnswer}`;
                }).join('\n\n---\n\n');

                const prompt = `Siz tajribali o'zbek tili va ingliz tili o'qituvchisisiz. Quyidagi ${chunk.length} ta savol va o'quvchi javoblarini baholang.

MUHIM QOIDALAR:
1. Agar "To'g'ri javob(lar)" ko'rsatilgan bo'lsa, o'quvchi javobi shu javob(lar) bilan MAZMUN jihatdan mos kelishini tekshiring.
2. MA'NO va MAZMUN asosiy mezon. Yengil imlo xatolari yoki kichik grammatik kamchiliklar javobni noto'g'ri deyishga sabab bo'lmasligi kerak.
3. Javob o'zbek yoki ingliz tilida bo'lishi mumkin.
4. Agar javob to'g'ri javob bilan mazmunan bir xil yoki juda yaqin bo'lsa, TO'G'RI deb belgilang.
5. Faqat savolga mutlaqo aloqasiz yoki teskari ma'noli javoblarni NOTO'G'RI deb belgilang.
6. Har bir javob uchun contentScore (0-100) va grammarScore (0-100) bering.
7. Har bir javob uchun o'zbek tilida juda qisqa, foydali feedback yozing (agar xato bo'lsa, to'g'ri javobni ham ko'rsat).

Faqat quyidagi JSON formatida javob bering:
{
  "results": [
    {"isCorrect": true, "grammarScore": 95, "contentScore": 100, "feedback": "Juda yaxshi!"},
    ... (jami ${chunk.length} ta element)
  ]
}

BAHOLASH UCHUN MA'LUMOTLAR:
${batchInfo}`;

                console.log(`[AI Batch Check] Chunk ${idx + 1}/${chunks.length} | Attempt ${attempt} (Start)`);

                const result = await model.generateContent(prompt);
                const response = await result.response;
                let text = response.text();

                text = text.replace(/```json/g, "").replace(/```/g, "").trim();
                const jsonMatch = text.match(/\{[\s\S]*\}/);

                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]) as AIBatchCheckResult;
                    if (parsed.results && parsed.results.length === chunk.length) {
                        console.log(`[AI Batch Check] Chunk ${idx + 1}/${chunks.length} | Success`);
                        const mappedResults = parsed.results.map(r => ({
                            isCorrect: !!r.isCorrect,
                            grammarScore: Math.min(100, Math.max(0, Number(r.grammarScore) || 0)),
                            contentScore: Math.min(100, Math.max(0, Number(r.contentScore) || 0)),
                            feedback: String(r.feedback || "")
                        }));

                        allResultsRaw[idx] = mappedResults;

                        // Update Cache (Memory & DB)
                        for (const [i, res] of mappedResults.entries()) {
                            const q = chunk[i];
                            const key = getCacheKey(q.text, q.studentAnswer);
                            aiCache.set(key, res);

                            try {
                                await query(
                                    `INSERT INTO ai_responses_cache (question_hash, question_text, answer_text, result)
                                     VALUES ($1, $2, $3, $4)
                                     ON CONFLICT (question_hash) DO NOTHING`,
                                    [key, q.text, q.studentAnswer, JSON.stringify(res)]
                                );
                            } catch (dbErr) {
                                console.error('[AI Cache] DB Save Error:', dbErr);
                            }
                        }

                        return;
                    }
                }
                throw new Error(`Invalid response format or count mismatch (Got ${text.length} chars)`);

            } catch (err: any) {
                const isRateLimit = err.message?.includes("429") || err.message?.includes("Quota") || err.message?.includes("RESOURCE_EXHAUSTED");
                console.error(`[AI Batch Check] Chunk ${idx + 1} Attempt ${attempt} failed: ${err.message?.substring(0, 100)}...`);

                if (attempt === MAX_RETRIES) {
                    const errorResults = chunk.map(() => ({
                        isCorrect: false,
                        contentScore: 0,
                        grammarScore: 0,
                        feedback: "Xatolik (Limit yoki Format)."
                    }));
                    allResultsRaw[idx] = errorResults;
                    return;
                }

                // Longer wait on rate limit, exponential backoff otherwise
                const waitTime = isRateLimit ? (30000 + Math.random() * 15000) : (3000 * Math.pow(2, attempt));
                console.log(`[AI Batch Check] Retrying chunk ${idx + 1} in ${Math.round(waitTime / 1000)}s...`);
                await new Promise(r => setTimeout(r, waitTime));
            }
        }
    }

    // Run pool
    const workers = [];
    for (let i = 0; i < CONCURRENCY_LIMIT; i++) {
        workers.push((async () => {
            while (chunkIndices.length > 0) {
                const idx = chunkIndices.shift();
                if (idx !== undefined) await processChunk(idx);
            }
        })());
    }

    await Promise.all(workers);

    // Merge pending results back into finalResults using originalIndex
    allResultsRaw.forEach((chunkRes, chunkIdx) => {
        if (chunkRes) {
            const chunk = chunks[chunkIdx];
            chunkRes.forEach((res, i) => {
                const originalIdx = chunk[i].originalIndex;
                finalResults[originalIdx] = res;
            });
        }
    });

    return finalResults;
}

export async function checkAnswerWithAI(
    question: string,
    studentAnswer: string,
    questionType: string
): Promise<AICheckResult> {
    const results = await checkAnswersWithAIBatch([{ text: question, studentAnswer, type: questionType }]);
    return results[0];
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
        const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";
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
