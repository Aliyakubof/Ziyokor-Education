import { pool } from './db';
import { v4 as uuidv4 } from 'uuid';

const quiz = {
    id: uuidv4(),
    level: 'Beginner',
    unit: '1',
    title: 'Beginner Unit 1 Vocabulary',
    questions: [
        // --- Part 1: English to Uzbek ---
        {
            type: 'info-slide',
            text: 'Translate the words into Uzbek',
            info: 'VOCABULARY',
            options: [],
            correctIndex: -1,
            timeLimit: 0,
            acceptedAnswers: []
        },
        {
            type: 'text-input',
            info: 'Translate into Uzbek',
            text: 'Appearance',
            options: [],
            acceptedAnswers: ["Tashqi ko'rinish", "Tashqi korinish", "Ko'rinish", "Korinish"],
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'text-input',
            info: 'Translate into Uzbek',
            text: 'Cheek',
            options: [],
            acceptedAnswers: ["Yonoq", "Bet", "Yuz"],
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'text-input',
            info: 'Translate into Uzbek',
            text: 'Imagine',
            options: [],
            acceptedAnswers: ["Tasavvur qilmoq", "Tasavvur etmoq", "O'ylamoq"],
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'text-input',
            info: 'Translate into Uzbek',
            text: 'Beach',
            options: [],
            acceptedAnswers: ["Sohil", "Plej", "Plyaj", "Dengiz bo'yi"],
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'text-input',
            info: 'Translate into Uzbek',
            text: 'Glasses',
            options: [],
            acceptedAnswers: ["Ko'zoynak", "Kozoynak"],
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'text-input',
            info: 'Translate into Uzbek',
            text: 'Meet',
            options: [],
            acceptedAnswers: ["Uchrashmoq", "Ko'rishmoq", "Tanishmoq"],
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'text-input',
            info: 'Translate into Uzbek',
            text: 'Oxen',
            options: [],
            acceptedAnswers: ["Ho'kizlar", "Hokizlar"],
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'text-input',
            info: 'Translate into Uzbek',
            text: 'Blog entry',
            options: [],
            acceptedAnswers: ["Blog yozuvi", "Blog posti", "Blog maqolasi"],
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'text-input',
            info: 'Translate into Uzbek',
            text: 'Impolite',
            options: [],
            acceptedAnswers: ["Odobsiz", "Qo'pol", "Hurmatsiz"],
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'text-input',
            info: 'Translate into Uzbek',
            text: 'Writers',
            options: [],
            acceptedAnswers: ["Yozuvchilar", "Mualliflar"],
            timeLimit: 0,
            correctIndex: -1
        },

        // --- Part 2: Uzbek to English ---
        {
            type: 'info-slide',
            text: 'Translate the words into English',
            info: 'VOCABULARY',
            options: [],
            correctIndex: -1,
            timeLimit: 0,
            acceptedAnswers: []
        },
        {
            type: 'text-input',
            info: 'Translate into English',
            text: 'Kulmoq',
            options: [],
            acceptedAnswers: ["Laugh", "Smile", "To laugh"],
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'text-input',
            info: 'Translate into English',
            text: "G’amxo’rlik qilmoq",
            options: [],
            acceptedAnswers: ["Care", "Take care", "Look after", "Care for"],
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'text-input',
            info: 'Translate into English',
            text: 'Mexnatkash',
            options: [],
            acceptedAnswers: ["Hard-working", "Hardworking", "Diligent", "Industrious"],
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'text-input',
            info: 'Translate into English',
            text: 'Jasur',
            options: [],
            acceptedAnswers: ["Brave", "Courageous", "Bold"],
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'text-input',
            info: 'Translate into English',
            text: 'Uyatchan',
            options: [],
            acceptedAnswers: ["Shy", "Bashful"],
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'text-input',
            info: 'Translate into English',
            text: 'Dangasa',
            options: [],
            acceptedAnswers: ["Lazy", "Idle"],
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'text-input',
            info: 'Translate into English',
            text: 'Kirishimli',
            options: [],
            acceptedAnswers: ["Sociable", "Outgoing", "Friendly"],
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'text-input',
            info: 'Translate into English',
            text: 'Do’mboq',
            options: [],
            acceptedAnswers: ["Plump", "Chubby", "Fat"],
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'text-input',
            info: 'Translate into English',
            text: 'O’rgimchaklar',
            options: [],
            acceptedAnswers: ["Spiders"],
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'text-input',
            info: 'Translate into English',
            text: 'Tishlar',
            options: [],
            acceptedAnswers: ["Teeth", "Tooths"],
            timeLimit: 0,
            correctIndex: -1
        }
    ]
};

async function seed() {
    try {
        console.log('Connecting to database...');
        const client = await pool.connect();
        try {
            console.log('Inserting quiz...');
            await client.query(
                `INSERT INTO unit_quizzes (id, level, unit, title, questions) 
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (id) DO UPDATE 
                 SET level = $2, unit = $3, title = $4, questions = $5`,
                [quiz.id, quiz.level, quiz.unit, quiz.title, JSON.stringify(quiz.questions)]
            );
            console.log('Quiz "Beginner Unit 1 Vocabulary" inserted successfully');
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error seeding quiz:', err);
    }
    process.exit(0);
}

seed();
