import { query } from './db';

async function testConnection() {
    try {
        const res = await query('SELECT NOW()');
        console.log('Database connection test successful:', res.rows[0]);
        process.exit(0);
    } catch (err: any) {
        console.error('Database connection test failed:', err.message);
        process.exit(1);
    }
}

testConnection();
