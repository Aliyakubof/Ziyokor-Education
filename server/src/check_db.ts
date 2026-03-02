import { query } from './db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function check() {
    try {
        const teachers = await query('SELECT id, name, phone FROM teachers');
        console.log('Teachers Count:', teachers.rowCount);
        teachers.rows.forEach(t => console.log(`- ${t.name} (${t.phone}) [ID: ${t.id}]`));

        const students = await query('SELECT id, name FROM students LIMIT 5');
        console.log('\nSome Students:');
        students.rows.forEach(s => console.log(`- ${s.name} [ID: ${s.id}]`));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

check();
