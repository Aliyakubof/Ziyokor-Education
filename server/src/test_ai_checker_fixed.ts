import { checkAnswerWithAI } from './aiChecker';

async function run() {
    console.log("AI ni tekshirish boshlandi...");
    
    const result1 = await checkAnswerWithAI(
        "What is the capital of UK?",
        "London",
        "text-input"
    );
    console.log("Natija 1 (To'liq to'g'ri javob - London):\n", result1);

    const result2 = await checkAnswerWithAI(
        "Translate to English: olma",
        "appla", 
        "text-input"
    );
    console.log("Natija 2 (Kichik xato bilan yozilgan to'g'ri javob - appla):\n", result2);

    const result3 = await checkAnswerWithAI(
        "2 + 2 nechiga teng?",
        "besh",
        "text-input"
    );
    console.log("Natija 3 (Mutlaqo noto'g'ri javob - besh):\n", result3);
    
    console.log("\nTekshiruv muvaffaqiyatli yakunlandi.");
    process.exit(0);
}

run();
