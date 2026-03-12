const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_kBgUWp4oz2Dm@ep-cool-sound-ago9vnzl-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

const pool = new Pool({
    connectionString: connectionString,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
});

async function checkData() {
    try {
        const students = await pool.query('SELECT id, name, group_id FROM students');
        console.log('STUDENTS_START');
        console.log(JSON.stringify(students.rows, null, 2));
        console.log('STUDENTS_END');
        
        const teachers = await pool.query('SELECT id, name, phone FROM teachers');
        console.log('TEACHERS_START');
        console.log(JSON.stringify(teachers.rows, null, 2));
        console.log('TEACHERS_END');
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
        process.exit();
    }
}

checkData();
