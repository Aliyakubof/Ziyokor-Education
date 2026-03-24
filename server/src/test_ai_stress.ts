import { checkAnswersWithAIBatch } from './aiChecker';
import { query } from './db';

async function runStressTest() {
    console.log("🚀 AI Stress Test boshlanmoqda (150 ta savol)...");
    
    // Asosiy savollar bazasi
    const baseQuestions = [
        { text: "Translate to English: olma", studentAnswer: "appla", type: "text-input" }, // typo
        { text: "What is the capital of UK?", studentAnswer: "london", type: "text-input" }, // correct
        { text: "Translate: quyosh", studentAnswer: "moon", type: "text-input" }, // incorrect
        { text: "Translate: osmon", studentAnswer: "sky", type: "text-input" }, // correct
        { text: "Translate: suv", studentAnswer: "water ", type: "text-input" }, // space typo
        { text: "The opposite of 'hot' is ___", studentAnswer: "cold", type: "fill-blank" }, // correct
        { text: "Translate: avtomobil", studentAnswer: "car", type: "text-input" }, // correct
        { text: "Find mistake: I is a student", studentAnswer: "I am a student", type: "find-mistake" }, // correct
        { text: "Find mistake: He go to school", studentAnswer: "He goes to school", type: "find-mistake" }, // correct
        { text: "Translate: daraxt", studentAnswer: "treee", type: "text-input" } // typo
    ];

    const questions: any[] = [];
    
    // 150 ta savol hosil qilish (15 marta takrorlash)
    for (let i = 0; i < 15; i++) {
        baseQuestions.forEach((q, idx) => {
            questions.push({
                text: `${q.text} (variant ${i+1})`, // Unikallik qo'shish (keshdan o'tib ketmaslik uchun)
                studentAnswer: q.studentAnswer,
                type: q.type,
            });
        });
    }

    console.log(`✅ Jami ${questions.length} ta savol tayyorlandi.`);
    console.log(`⏱ Endi AI o'z serverida bularni tahlil qilmoqda. Kuting...\n`);
    
    const startTime = Date.now();
    
    try {
        const results = await checkAnswersWithAIBatch(questions);
        
        const endTime = Date.now();
        const timeTaken = ((endTime - startTime) / 1000).toFixed(2);
        
        console.log(`🎉 Stress Test Muvaffaqiyatli Yakunlandi!`);
        console.log(`⏱ Sarflangan umumiy vaqt: ${timeTaken} soniya`);
        console.log(`📊 Tekshirila olgan javoblar soni: ${results.length}`);
        
        const successCount = results.filter(r => r && typeof r.isCorrect === 'boolean').length;
        console.log(`✅ To'g'ri ishlangan so'rovlar: ${successCount} / 150`);
        
        console.log("\nNamuna uchun birinchi 3 ta savol va AI bahosi:");
        for(let i=0; i<3; i++) {
            console.log(`\n🔹 Savol: ${questions[i].text}`);
            console.log(`📝 O'quvchi javobi: ${questions[i].studentAnswer}`);
            console.log(`🤖 AI Xulosasi:`, results[i]);
            console.log("-------------------");
        }
    } catch (err) {
        console.error("❌ Xatolik yuz berdi:", err);
    }
    
    process.exit(0);
}

runStressTest();
