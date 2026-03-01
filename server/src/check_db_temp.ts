
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkTeacher() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ziyokor'
    });

    try {
        await client.connect();
        console.log('--- TEACHERS LIST ---');
        const res = await client.query('SELECT name, phone, password FROM teachers');
        console.table(res.rows);

        console.log('\n--- SEARCHING FOR 507764244 ---');
        const searchRes = await client.query('SELECT * FROM teachers WHERE phone LIKE \'%507764244%\'');
        console.log(JSON.stringify(searchRes.rows, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkTeacher();
