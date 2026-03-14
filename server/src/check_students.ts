import { query } from './db';

async function check() {
    try {
        const res = await query('SELECT count(*) FROM students');
        console.log('Student count:', res.rows[0].count);
        
        if (Number(res.rows[0].count) > 0) {
            const sample = await query('SELECT id, name FROM students LIMIT 1');
            console.log('Sample student:', sample.rows[0]);
        }
    } catch (e: any) {
        console.error('Check failed:', e.message);
    }
}

check();
