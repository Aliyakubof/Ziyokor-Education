import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export interface AICheckResult {
    score: number; // 0 to 100
    feedback: string;
}

export async function checkAnswerWithAI(
    question: string,
    studentAnswer: string,
    correctAnswer: string,
    questionType: string
): Promise<AICheckResult> {
    if (!apiKey) {
        console.error("GEMINI_API_KEY is not set");
        return { score: 0, feedback: "AI checking is currently unavailable." };
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            You are an English teacher checking a student's answer for a quiz.
            
            Question: "${question}"
            Student's Answer: "${studentAnswer}"
            Reference/Correct Answer: "${correctAnswer}"
            Question Type: "${questionType}"

            Instructions:
            1. Evaluate the student's answer based on the reference answer and question type.
            2. For translation or open-ended questions, be flexible with minor typos or grammatical errors unless they change the meaning.
            3. Provide a score from 0 to 100.
            4. Provide a brief, encouraging feedback in Uzbek.
            
            Respond ONLY with a JSON object in this format:
            {
                "score": number,
                "feedback": "string"
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
        return { score: 0, feedback: "Javobni tekshirishda xatolik yuz berdi." };
    }
}
