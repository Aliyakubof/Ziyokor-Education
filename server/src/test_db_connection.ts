import dotenv from 'dotenv';
dotenv.config();
import { Pool } from 'pg';

console.log('--- DB Connection Test ---');
console.log('ENV DATABASE_URL:', process.env.DATABASE_URL ? 'PRESENT (starts with ' + process.env.DATABASE_URL.substring(0, 20) + '...)' : 'MISSING');

if (!process.env.DATABASE_URL) {
    console.log('No DATABASE_URL found!');
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function test() {
    try {
        console.log('Connecting...');
        const res = await pool.query('SELECT NOW()');
        console.log('Success! Result:', res.rows[0]);
    } catch (err) {
        console.error('Connection failed:', err);
    } finally {
        await pool.end();
    }
}

test();
