import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

const questions = [
    // Passive Voice
    { q: "The passive of: 'They built the Eiffel Tower in 1889'", a: "The Eiffel Tower was built in 1889" },
    { q: "The passive of: 'Someone has stolen my wallet'", a: "My wallet has been stolen" },
    { q: "The passive of: 'They are painting the house'", a: "The house is being painted" },
    { q: "The passive of: 'They had finished the work before noon'", a: "The work had been finished before noon" },
    { q: "The passive of: 'We will announce the results tomorrow'", a: "The results will be announced tomorrow" },
    { q: "The passive of: 'Someone might have taken your bag'", a: "Your bag might have been taken" },
    { q: "The passive of: 'They were interviewing candidates all day'", a: "Candidates were being interviewed all day" },
    { q: "The passive of: 'Nobody has solved this problem yet'", a: "This problem has not been solved yet" },
    { q: "The passive of: 'People speak English worldwide'", a: "English is spoken worldwide" },
    { q: "The passive of: 'The storm destroyed many houses'", a: "Many houses were destroyed by the storm" },
    // Conditionals
    { q: "Type 1 Conditional: If it _____ tomorrow, we will cancel the picnic.", a: "rains" },
    { q: "Type 2 Conditional: If I _____ you, I would apologize.", a: "were" },
    { q: "Type 3 Conditional: If she _____ harder, she would have passed.", a: "had studied" },
    { q: "Mixed Conditional: If I had slept earlier, I _____ tired now.", a: "wouldn't be" },
    { q: "Unless he _____ immediately, he will miss the train.", a: "leaves" },
    { q: "Had I known earlier, I _____ helped you.", a: "would have" },
    { q: "But for your help, I _____ failed the exam.", a: "would have" },
    { q: "Provided that you _____ hard, you will succeed.", a: "work" },
    { q: "Supposing you _____ a million dollars, what would you do?", a: "won" },
    { q: "If only I _____ listened to her advice back then!", a: "had" },
    // Reported Speech
    { q: "Direct: 'I am tired.' → Reported: She said that she _____ tired.", a: "was" },
    { q: "Direct: 'I have finished.' → Reported: He said that he _____.", a: "had finished" },
    { q: "Direct: 'I will come tomorrow.' → Reported: She said she _____ the next day.", a: "would come" },
    { q: "Direct: 'Don't touch that!' → Reported: He told me not _____ that.", a: "to touch" },
    { q: "Direct: 'Can you help me?' → Reported: She asked if I _____ help her.", a: "could" },
    { q: "Direct: 'I was sleeping when you called.' → Reported: He said he _____ when I called.", a: "had been sleeping" },
    { q: "Direct: 'We have been waiting for hours.' → Reported: They said they _____ for hours.", a: "had been waiting" },
    { q: "Direct: 'We bought this yesterday.' → Reported: They said they _____ it the day before.", a: "had bought" },
    { q: "Direct: 'I may be wrong.' → Reported: He admitted he _____ be wrong.", a: "might" },
    { q: "Direct: 'Study harder!' → Reported: The teacher advised her _____ harder.", a: "to study" },
    // Inversion
    { q: "Not only _____ he arrive late, but he also forgot his report.", a: "did" },
    { q: "Scarcely _____ she left when it started raining.", a: "had" },
    { q: "No sooner _____ we sat down than the fire alarm went off.", a: "had" },
    { q: "Hardly _____ he spoken when the lights went out.", a: "had" },
    { q: "On no account _____ you leave the building during the drill.", a: "should" },
    { q: "Under no circumstances _____ the documents be shared.", a: "should" },
    { q: "Little _____ she know what was about to happen.", a: "did" },
    { q: "Not until he retired _____ he realize how much he loved his job.", a: "did" },
    { q: "Only after she called him _____ he respond.", a: "did" },
    { q: "Such _____ her confidence that everyone believed her.", a: "was" },
    // Gerund vs Infinitive
    { q: "She avoided _____ direct eye contact during the interview.", a: "making" },
    { q: "He admitted _____ the company funds.", a: "having stolen" },
    { q: "They managed _____ the summit despite the bad weather.", a: "to reach" },
    { q: "I can't help _____ when I hear that old song.", a: "crying" },
    { q: "She denied _____ anything about the plan.", a: "knowing" },
    { q: "He suggested _____ the meeting until next week.", a: "postponing" },
    { q: "I regret _____ you that your application was unsuccessful.", a: "to inform" },
    { q: "She stopped _____ when she heard the noise outside.", a: "talking" },
    { q: "He remembered _____ her flowers on her birthday.", a: "to buy" },
    { q: "They kept _____ the same mistakes over and over.", a: "making" },
    // Perfect Tenses
    { q: "By the time he arrives, we _____ dinner.", a: "will have finished" },
    { q: "She _____ working here for five years by next June.", a: "will have been" },
    { q: "I'm exhausted. I _____ non-stop since morning.", a: "have been working" },
    { q: "When I arrived, they _____ for over two hours.", a: "had been waiting" },
    { q: "She _____ the book before the film came out.", a: "had already read" },
    { q: "He _____ three cups of coffee before noon.", a: "had drunk" },
    { q: "They _____ the project by the time the client visits.", a: "will have completed" },
    { q: "I _____ English for ten years.", a: "have been learning" },
    { q: "She _____ to Paris twice before her 30th birthday.", a: "had been" },
    { q: "We _____ here since 9 AM and no one has helped us.", a: "have been sitting" },
    // Subjunctive & Wishes
    { q: "I wish I _____ taller. (present wish)", a: "were" },
    { q: "I wish I _____ studied harder last year.", a: "had" },
    { q: "She wishes she _____ speak French fluently.", a: "could" },
    { q: "It's time the government _____ action on this issue.", a: "took" },
    { q: "It's high time you _____ a decision about your future.", a: "made" },
    { q: "I'd rather you _____ tell anyone about this.", a: "didn't" },
    { q: "If only she _____ here right now!", a: "were" },
    { q: "He would sooner _____ than admit he was wrong.", a: "die" },
    { q: "It is essential that every student _____ on time. (subjunctive)", a: "arrive" },
    { q: "The committee recommended that he _____ reinstated. (subjunctive)", a: "be" },
    // Causative
    { q: "She had her car _____ at the garage.", a: "repaired" },
    { q: "He got the mechanic _____ the brakes.", a: "to check" },
    { q: "We need to get the roof _____.", a: "fixed" },
    { q: "She had her hair _____ before the wedding.", a: "done" },
    { q: "He got himself _____ in the arm during the accident.", a: "injured" },
    // Relative Clauses
    { q: "The book _____ I told you about has finally been published.", a: "that" },
    { q: "The woman _____ wallet was stolen reported it to the police.", a: "whose" },
    { q: "This is the city _____ I was born.", a: "where" },
    { q: "The reason _____ he left was never explained.", a: "why" },
    { q: "2005 was the year _____ she got married.", a: "when" },
    // Modal Verbs
    { q: "You _____ have told me earlier! Now it's too late.", a: "could" },
    { q: "She _____ be at home. Her lights are on.", a: "must" },
    { q: "He _____ have taken your umbrella by mistake.", a: "might" },
    { q: "You _____ drink and drive. It's illegal.", a: "mustn't" },
    { q: "You _____ come if you don't want to. It's optional.", a: "don't have to" },
    { q: "She _____ speak three languages when she was young.", a: "could" },
    { q: "We _____ book in advance. They're always fully booked.", a: "should" },
    { q: "He _____ have forgotten. He has an excellent memory.", a: "can't" },
    { q: "You _____ asked before taking it.", a: "should have" },
    { q: "By the smell, dinner _____ be almost ready.", a: "must" },
    // Articles & Prepositions
    { q: "He is _____ honest man who always tells the truth.", a: "an" },
    { q: "She plays _____ violin in the city orchestra.", a: "the" },
    { q: "I will see you _____ Monday morning.", a: "on" },
    { q: "She has been _____ Paris for the last two weeks.", a: "in" },
    { q: "He insisted _____ paying for everyone's meal.", a: "on" },
    { q: "She is very good _____ solving complex problems.", a: "at" },
    { q: "They congratulated him _____ winning the award.", a: "on" },
    { q: "He has been accused _____ stealing company funds.", a: "of" },
    { q: "She blamed him _____ causing the accident.", a: "for" },
    { q: "He is married _____ a famous actress.", a: "to" },
    // Mixed Advanced
    { q: "_____ having studied all night, she still failed the exam.", a: "Despite" },
    { q: "The film, _____ lasted three hours, was worth every minute.", a: "which" },
    { q: "He pretended _____ asleep when she entered the room.", a: "to be" },
    { q: "She is believed _____ the most talented student in the school.", a: "to be" },
    { q: "They are thought _____ the country last night.", a: "to have left" },
    { q: "Not a word _____ during the entire ceremony.", a: "was spoken" },
    { q: "She seems _____ a lot of experience in this field.", a: "to have" },
    { q: "The project is reported _____ ahead of schedule.", a: "to be" },
    { q: "It occurred to me _____ I had left my keys inside.", a: "that" },
    { q: "He was on the verge of _____ when the good news arrived.", a: "giving up" },
    { q: "She is used to _____ up early every morning.", a: "getting" },
    { q: "I would rather _____ home than go to that party.", a: "stay" },
    { q: "_____ finished eating, they asked for the bill.", a: "Having" },
    { q: "The report must _____ by the end of the week.", a: "be submitted" },
    { q: "Only _____ at her did he realize something was wrong.", a: "by looking" },
    { q: "She prevented him _____ making a terrible mistake.", a: "from" },
    { q: "He spent three hours _____ the broken engine.", a: "fixing" },
    { q: "The harder you work, _____ results you will get.", a: "the better" },
    { q: "She earns twice _____ her husband does.", a: "as much as" },
    { q: "No sooner _____ I arrived than the meeting started.", a: "had" },
    { q: "She works as _____ teacher at a local school.", a: "a" },
    { q: "They asked me _____ the meeting the following day.", a: "to attend" },
    { q: "The children made their parents _____ proud.", a: "feel" },
    { q: "He was made _____ for three hours in the cold.", a: "to wait" },
    { q: "I can't stand _____ to wait like this.", a: "being made" },
    { q: "She let her students _____ home early.", a: "go" },
    { q: "I found the lecture _____ engaging and thought-provoking.", a: "incredibly" },
    { q: "The news is _____ that we can hardly believe it.", a: "so good" },
    { q: "Such _____ the noise that no one could sleep.", a: "was" },
    { q: "It's no good _____ about things you cannot change.", a: "worrying" },
];

async function runTest() {
    console.log(`\n🤖 Model: ${modelName}`);
    console.log(`📚 Savollar: ${questions.length} ta`);
    console.log(`📦 Chunk: 10 | ⚡ Concurrency: 2\n`);

    const genAI = new GoogleGenerativeAI(apiKey);

    // 1. Connection test
    process.stdout.write("1️⃣  Ulanish tekshiruvi... ");
    const t0 = Date.now();
    try {
        const m = genAI.getGenerativeModel({ model: modelName });
        const r = await m.generateContent("Say OK only.");
        console.log(`✅ ${r.response.text().trim()} (${Date.now() - t0}ms)\n`);
    } catch (e: any) {
        console.log(`❌ XATO: ${e.message?.substring(0, 80)}`);
        process.exit(1);
    }

    // 2. Batch test
    console.log("2️⃣  150 ta savol batch tekshiruvi boshlanmoqda...\n");
    const CHUNK = 10, CONC = 2;
    const chunks: typeof questions[] = [];
    for (let i = 0; i < questions.length; i += CHUNK) chunks.push(questions.slice(i, i + CHUNK));

    const start = Date.now();
    let correct = 0;
    const times: number[] = [];
    const queue = [...Array(chunks.length).keys()];

    async function processChunk(idx: number) {
        const chunk = chunks[idx];
        const batchInfo = chunk.map((q, i) => `Q${i + 1}: ${q.q}\nAnswer: ${q.a}`).join('\n\n---\n\n');
        const prompt = `You are an expert English grammar teacher. Evaluate if each student answer is correct.
Return ONLY JSON: {"results": [{"isCorrect": true/false}, ...]} (${chunk.length} items)

${batchInfo}`;
        const t1 = Date.now();
        try {
            const m = genAI.getGenerativeModel({ model: modelName });
            const r = await m.generateContent(prompt);
            let text = r.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
            const match = text.match(/\{[\s\S]*\}/);
            if (match) {
                const p = JSON.parse(match[0]);
                if (p.results) correct += p.results.filter((x: any) => x.isCorrect).length;
            }
        } catch { }
        const elapsed = Date.now() - t1;
        times.push(elapsed);
        const total = ((Date.now() - start) / 1000).toFixed(1);
        console.log(`  ✅ Chunk ${idx + 1}/${chunks.length} — ${elapsed}ms | O'tgan: ${total}s`);
    }

    const workers = Array(CONC).fill(null).map(() => (async () => {
        while (queue.length > 0) {
            const idx = queue.shift();
            if (idx !== undefined) await processChunk(idx);
        }
    })());
    await Promise.all(workers);

    const total = (Date.now() - start) / 1000;
    const avg = times.reduce((a, b) => a + b, 0) / times.length / 1000;

    console.log(`\n${'='.repeat(55)}`);
    console.log(`📊 NATIJALAR — ${modelName}`);
    console.log(`  ✅ To'g'ri:      ${correct} / ${questions.length} (${Math.round(correct / questions.length * 100)}%)`);
    console.log(`  ⏱️  Jami vaqt:   ${total.toFixed(2)} soniya`);
    console.log(`  📦 Avg chunk:   ${avg.toFixed(2)} soniya`);
    console.log(`  🚀 Tezlik:      ${(questions.length / total).toFixed(1)} savol/soniya`);
    console.log(`\n💡 Kengaytirilgan hisob-kitob:`);
    const for448 = (448 / questions.length) * total;
    const for1120 = (1120 / questions.length) * total * 0.4; // 40% AI
    console.log(`  📌 448 savol (1 guruh):    ~${for448.toFixed(0)}s (~${(for448 / 60).toFixed(1)} daqiqa)`);
    console.log(`  📌 1120 savol (40% AI):    ~${for1120.toFixed(0)}s (~${(for1120 / 60).toFixed(1)} daqiqa)`);
    console.log(`  💰 Narx/150 savol:         ~$0.002`);
    console.log(`  💰 Oylik (1000 student):   ~$1-2/oy`);
    console.log(`${'='.repeat(55)}\n`);
}

runTest().catch(console.error);
