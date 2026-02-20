import { pool } from './db';
import { v4 as uuidv4 } from 'uuid';

const quiz = {
    id: uuidv4(),
    level: 'Beginner',
    unit: '2',
    title: 'Beginner Unit 2 Test 1',
    questions: [
        // --- Section A ---
        {
            type: 'info-slide',
            text: 'A Grammar: Have got / Has got',
            info: 'SECTION A',
            options: [],
            correctIndex: -1,
            timeLimit: 0,
            acceptedAnswers: []
        },
        {
            type: 'word-box',
            info: 'Complete with Have, haven’t, has, hasn’t',
            text: '[1] the teacher got glasses? No, she [2].',
            options: ['Have', "haven't", 'has', "hasn't"],
            acceptedAnswers: ['Has', "hasn't"],
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'word-box',
            info: 'Complete with Have, haven’t, has, hasn’t',
            text: '[1] we got a family tree? Yes, we [2].',
            options: ['Have', "haven't", 'has', "hasn't"],
            acceptedAnswers: ['Have', 'have'],
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'word-box',
            info: 'Complete with Have, haven’t, has, hasn’t',
            text: '[1] your grandfather got a moustache? Yes, he [2].',
            options: ['Have', "haven't", 'has', "hasn't"],
            acceptedAnswers: ['Has', 'has'],
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'word-box',
            info: 'Complete with Have, haven’t, has, hasn’t',
            text: '[1] they got a plump and naughty son? Yes, they [2].',
            options: ['Have', "haven't", 'has', "hasn't"],
            acceptedAnswers: ['Have', 'have'],
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'word-box',
            info: 'Complete with Have, haven’t, has, hasn’t',
            text: '[1] his daughter got an orange ? Yes, she [2].',
            options: ['Have', "haven't", 'has', "hasn't"],
            acceptedAnswers: ['Has', 'has'],
            timeLimit: 0,
            correctIndex: -1
        },

        // --- Section B ---
        {
            type: 'info-slide',
            text: 'B Grammar: Object Pronouns',
            info: 'SECTION B',
            options: [],
            correctIndex: -1,
            timeLimit: 0,
            acceptedAnswers: []
        },
        {
            type: 'word-box',
            info: 'Complete with pronouns',
            text: 'Peter’s nephews draw an octopus. Peter’s nephews draw [1].',
            options: ['me', 'you', 'him', 'her', 'it', 'them', 'us'],
            acceptedAnswers: ['it'], // octopus
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'word-box',
            info: 'Complete with pronouns',
            text: 'John’s grandparents look after John well. John’s grandparents look after [1] well.',
            options: ['me', 'you', 'him', 'her', 'it', 'them', 'us'],
            acceptedAnswers: ['him'], // John
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'word-box',
            info: 'Complete with pronouns',
            text: 'Daniel looks like his parents. Daniel looks like [1].',
            options: ['me', 'you', 'him', 'her', 'it', 'them', 'us'],
            acceptedAnswers: ['them'], // parents
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'word-box',
            info: 'Complete with pronouns',
            text: 'The students meet Monica at school. The students meet [1] at school.',
            options: ['me', 'you', 'him', 'her', 'it', 'them', 'us'],
            acceptedAnswers: ['her'], // Monica
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'word-box',
            info: 'Complete with pronouns',
            text: 'The vet helps animals. The vet helps [1].',
            options: ['me', 'you', 'him', 'her', 'it', 'them', 'us'],
            acceptedAnswers: ['them'], // animals
            timeLimit: 0,
            correctIndex: -1
        },

        // --- Section C ---
        {
            type: 'info-slide',
            text: 'C Grammar: Possessive Adjectives & Pronouns',
            info: 'SECTION C',
            options: [],
            correctIndex: -1,
            timeLimit: 0,
            acceptedAnswers: []
        },
        {
            type: 'word-box',
            info: 'Choose the correct form',
            text: 'This young mother is [1].',
            options: ['her', 'hers'],
            acceptedAnswers: ['hers'],
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'word-box',
            info: 'Choose the correct form',
            text: '[1] sister is at the university.',
            options: ['Our', 'ours'],
            acceptedAnswers: ['Our'],
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'word-box',
            info: 'Choose the correct form',
            text: 'This blue pen is [1].',
            options: ['my', 'mine'],
            acceptedAnswers: ['mine'],
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'word-box',
            info: 'Choose the correct form',
            text: '[1] son smiles at [2] grandfather.',
            options: ['Their', 'theirs', 'your', 'yours'],
            acceptedAnswers: ['Their', 'your'],
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'word-box',
            info: 'Choose the correct form',
            text: '[1] hobby is playing the guitar. What is [2]?',
            options: ['My', 'mine', 'your', 'yours'],
            acceptedAnswers: ['My', 'yours'],
            timeLimit: 0,
            correctIndex: -1
        },

        // --- Section D ---
        {
            type: 'info-slide',
            text: 'D Grammar: Who’s/whose & Possessive case',
            info: 'SECTION D',
            options: [],
            correctIndex: -1,
            timeLimit: 0,
            acceptedAnswers: []
        },
        {
            type: 'word-box',
            info: 'Choose the correct item',
            text: '[1] is John? –John is my [2] son',
            options: ['Who', 'whose', 'uncle’s', 'uncles’'],
            acceptedAnswers: ['Who', 'uncle’s'],
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'word-box',
            info: 'Choose the correct item',
            text: '[1] nephew is this boy? –This boy is [2] nephew.',
            options: ['Who', 'whose', 'Peters’', 'Peter’s'],
            acceptedAnswers: ['Whose', 'Peter’s'],
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'word-box',
            info: 'Choose the correct item',
            text: '[1] is a sportsman? – The [2] granddad is a sportsman.',
            options: ['Who', 'whose', 'childrens’', 'children’s'],
            acceptedAnswers: ['Who', 'children’s'],
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'word-box',
            info: 'Choose the correct item',
            text: '[1] is kind and hard-working? – [2] mother is kind and hard-working.',
            options: ['Who', 'whose', 'Jessicas’', 'Jessica’s'],
            acceptedAnswers: ['Who', 'Jessica’s'],
            timeLimit: 0,
            correctIndex: -1
        },
        {
            type: 'word-box',
            info: 'Choose the correct item',
            text: '[1] hair is straight? – [2] hair is straight.',
            options: ['Who', 'whose', 'Marys’', 'Mary’s'],
            acceptedAnswers: ['Whose', 'Mary’s'],
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
            console.log('Quiz "Beginner Unit 2 Test 1" inserted successfully');
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error seeding quiz:', err);
    }
    process.exit(0);
}

seed();
