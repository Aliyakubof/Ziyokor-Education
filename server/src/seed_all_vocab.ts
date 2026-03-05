import { pool } from './db';
import { v4 as uuidv4 } from 'uuid';

const vocabularyData = [
    // --- BEGINNER (A1) ---
    {
        level: 'Beginner',
        unit: '1',
        title: 'Colors & Numbers',
        questions: [
            { type: 'text-input', text: 'Red', acceptedAnswers: ['Qizil'] },
            { type: 'text-input', text: 'Blue', acceptedAnswers: ['Ko\'k', 'Moviy'] },
            { type: 'text-input', text: 'Green', acceptedAnswers: ['Yashil'] },
            { type: 'text-input', text: 'Yellow', acceptedAnswers: ['Sariq'] },
            { type: 'text-input', text: 'White', acceptedAnswers: ['Oq'] },
            { type: 'text-input', text: 'Black', acceptedAnswers: ['Qora'] },
            { type: 'text-input', text: 'One', acceptedAnswers: ['Bir'] },
            { type: 'text-input', text: 'Five', acceptedAnswers: ['Besh'] },
            { type: 'text-input', text: 'Ten', acceptedAnswers: ['O\'n'] },
            { type: 'text-input', text: 'Seven', acceptedAnswers: ['Yetti'] }
        ]
    },
    {
        level: 'Beginner',
        unit: '2',
        title: 'Family Members',
        questions: [
            { type: 'text-input', text: 'Father', acceptedAnswers: ['Ota', 'Dada'] },
            { type: 'text-input', text: 'Mother', acceptedAnswers: ['Ona', 'Aya', 'Onajon'] },
            { type: 'text-input', text: 'Brother', acceptedAnswers: ['Aka', 'Uka'] },
            { type: 'text-input', text: 'Sister', acceptedAnswers: ['Opa', 'Singil'] },
            { type: 'text-input', text: 'Grandfather', acceptedAnswers: ['Bobo', 'Dada'] },
            { type: 'text-input', text: 'Grandmother', acceptedAnswers: ['Buvijon', 'Buvi', 'Momo'] },
            { type: 'text-input', text: 'Son', acceptedAnswers: ['O\'g\'il'] },
            { type: 'text-input', text: 'Daughter', acceptedAnswers: ['Qiz'] }
        ]
    },
    {
        level: 'Beginner',
        unit: '3',
        title: 'Animals',
        questions: [
            { type: 'text-input', text: 'Dog', acceptedAnswers: ['Kuchuk', 'It'] },
            { type: 'text-input', text: 'Cat', acceptedAnswers: ['Mushuk'] },
            { type: 'text-input', text: 'Horse', acceptedAnswers: ['Ot'] },
            { type: 'text-input', text: 'Cow', acceptedAnswers: ['Sigir'] },
            { type: 'text-input', text: 'Lion', acceptedAnswers: ['Sher', 'Arslon'] },
            { type: 'text-input', text: 'Rabbit', acceptedAnswers: ['Quyon'] },
            { type: 'text-input', text: 'Bird', acceptedAnswers: ['Qush'] },
            { type: 'text-input', text: 'Fish', acceptedAnswers: ['Baliq'] }
        ]
    },
    {
        level: 'Beginner',
        unit: '4',
        title: 'Common Objects',
        questions: [
            { type: 'text-input', text: 'Book', acceptedAnswers: ['Kitob'] },
            { type: 'text-input', text: 'Pen', acceptedAnswers: ['Ruchka'] },
            { type: 'text-input', text: 'Table', acceptedAnswers: ['Stol'] },
            { type: 'text-input', text: 'Chair', acceptedAnswers: ['Stul', 'Kursi'] },
            { type: 'text-input', text: 'Door', acceptedAnswers: ['Eshik'] },
            { type: 'text-input', text: 'Window', acceptedAnswers: ['Deraza'] },
            { type: 'text-input', text: 'Key', acceptedAnswers: ['Kalit'] },
            { type: 'text-input', text: 'Phone', acceptedAnswers: ['Telefon'] }
        ]
    },

    // --- ELEMENTARY (A2) ---
    {
        level: 'Elementary',
        unit: '1',
        title: 'Daily Activities',
        questions: [
            { type: 'text-input', text: 'Wake up', acceptedAnswers: ['Uyg\'onmoq'] },
            { type: 'text-input', text: 'Go to school', acceptedAnswers: ['Maktabga bormoq'] },
            { type: 'text-input', text: 'Eat breakfast', acceptedAnswers: ['Nonushta qilmoq'] },
            { type: 'text-input', text: 'Brush teeth', acceptedAnswers: ['Tishni yuvmoq'] },
            { type: 'text-input', text: 'Wash hands', acceptedAnswers: ['Qo\'lni yuvmoq'] },
            { type: 'text-input', text: 'Study', acceptedAnswers: ['O\'qimoq', 'O\'rganmoq'] },
            { type: 'text-input', text: 'Read a book', acceptedAnswers: ['Kitob o\'qimoq'] },
            { type: 'text-input', text: 'Watch TV', acceptedAnswers: ['Televizor ko\'rmoq'] }
        ]
    },
    {
        level: 'Elementary',
        unit: '2',
        title: 'Jobs',
        questions: [
            { type: 'text-input', text: 'Teacher', acceptedAnswers: ['O\'qituvchi', 'Muallim'] },
            { type: 'text-input', text: 'Doctor', acceptedAnswers: ['Shifokor', 'Doxtir'] },
            { type: 'text-input', text: 'Driver', acceptedAnswers: ['Haydovchi'] },
            { type: 'text-input', text: 'Cook', acceptedAnswers: ['Oshpaz'] },
            { type: 'text-input', text: 'Engineer', acceptedAnswers: ['Muhandis'] },
            { type: 'text-input', text: 'Farmer', acceptedAnswers: ['Dehqon'] },
            { type: 'text-input', text: 'Nurse', acceptedAnswers: ['Hamshira'] }
        ]
    },
    {
        level: 'Elementary',
        unit: '3',
        title: 'Food & Drinks',
        questions: [
            { type: 'text-input', text: 'Apple', acceptedAnswers: ['Olma'] },
            { type: 'text-input', text: 'Milk', acceptedAnswers: ['Sut'] },
            { type: 'text-input', text: 'Bread', acceptedAnswers: ['Non'] },
            { type: 'text-input', text: 'Water', acceptedAnswers: ['Suv'] },
            { type: 'text-input', text: 'Rice', acceptedAnswers: ['Guruch', 'Osh'] },
            { type: 'text-input', text: 'Meat', acceptedAnswers: ['Go\'sht'] },
            { type: 'text-input', text: 'Vegetables', acceptedAnswers: ['Sabzavotlar'] }
        ]
    },
    {
        level: 'Elementary',
        unit: '4',
        title: 'Places in Town',
        questions: [
            { type: 'text-input', text: 'Bank', acceptedAnswers: ['Bank'] },
            { type: 'text-input', text: 'School', acceptedAnswers: ['Maktab'] },
            { type: 'text-input', text: 'Market', acceptedAnswers: ['Bozor'] },
            { type: 'text-input', text: 'Hospital', acceptedAnswers: ['Kasalxona', 'Shifoxona'] },
            { type: 'text-input', text: 'Park', acceptedAnswers: ['Bog\'', 'Park'] },
            { type: 'text-input', text: 'Shop', acceptedAnswers: ['Do\'kon'] },
            { type: 'text-input', text: 'Cinema', acceptedAnswers: ['Kinoteatr'] }
        ]
    },

    // --- PRE-INTERMEDIATE (B1) ---
    {
        level: 'Pre-Intermediate',
        unit: '1',
        title: 'Character & Personality',
        questions: [
            { type: 'text-input', text: 'Honest', acceptedAnswers: ['Rostgo\'y', 'Halol'] },
            { type: 'text-input', text: 'Brave', acceptedAnswers: ['Jasur', 'Qo\'rqmas'] },
            { type: 'text-input', text: 'Kind', acceptedAnswers: ['Mehribon', 'Oqko\'ngil'] },
            { type: 'text-input', text: 'Lazy', acceptedAnswers: ['Dangasa'] },
            { type: 'text-input', text: 'Hard-working', acceptedAnswers: ['Mehnatkash'] },
            { type: 'text-input', text: 'Polite', acceptedAnswers: ['Xushmuomala', 'Odobli'] },
            { type: 'text-input', text: 'Jealous', acceptedAnswers: ['Hasadgo\'y', 'Rashkchi'] }
        ]
    },
    {
        level: 'Pre-Intermediate',
        unit: '2',
        title: 'Travel & Holidays',
        questions: [
            { type: 'text-input', text: 'Airport', acceptedAnswers: ['Aeroport'] },
            { type: 'text-input', text: 'Suitcase', acceptedAnswers: ['Chomadon', 'Chamadan'] },
            { type: 'text-input', text: 'Passenger', acceptedAnswers: ['Yo\'lovchi'] },
            { type: 'text-input', text: 'Destination', acceptedAnswers: ['Manzil'] },
            { type: 'text-input', text: 'To book', acceptedAnswers: ['Band qilmoq'] },
            { type: 'text-input', text: 'Delay', acceptedAnswers: ['Kechikish'] }
        ]
    },
    {
        level: 'Pre-Intermediate',
        unit: '3',
        title: 'Technology',
        questions: [
            { type: 'text-input', text: 'Keyboard', acceptedAnswers: ['Klaviatura'] },
            { type: 'text-input', text: 'Laptop', acceptedAnswers: ['Noutbuk'] },
            { type: 'text-input', text: 'Software', acceptedAnswers: ['Dasturiy ta\'minot', 'Dastur'] },
            { type: 'text-input', text: 'Connection', acceptedAnswers: ['Aloqa', 'Ulanish'] },
            { type: 'text-input', text: 'To download', acceptedAnswers: ['Yuklab olmoq'] },
            { type: 'text-input', text: 'To upload', acceptedAnswers: ['Yuklamoq'] }
        ]
    },
    {
        level: 'Pre-Intermediate',
        unit: '4',
        title: 'Health',
        questions: [
            { type: 'text-input', text: 'Headache', acceptedAnswers: ['Bosh og\'rig\'i'] },
            { type: 'text-input', text: 'Prescription', acceptedAnswers: ['Retsept'] },
            { type: 'text-input', text: 'Treatment', acceptedAnswers: ['Davolanish', 'Muolaja'] },
            { type: 'text-input', text: 'Symptoms', acceptedAnswers: ['Belgilar', 'Simptomlar'] },
            { type: 'text-input', text: 'Patient', acceptedAnswers: ['Bemor'] }
        ]
    }
];

async function seed() {
    const client = await pool.connect();
    try {
        console.log('--- Starting Vocabulary Seeding ---');
        for (const data of vocabularyData) {
            const id = uuidv4();
            await client.query(
                `INSERT INTO unit_quizzes (id, level, unit, title, questions) 
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (id) DO NOTHING`,
                [id, data.level, data.unit, data.title, JSON.stringify(data.questions)]
            );
            console.log(`[Seed] Added: ${data.level} - Unit ${data.unit}: ${data.title}`);
        }
        console.log('--- Seeding Completed Successfully ---');
    } catch (err) {
        console.error('Seeding error:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

seed();
