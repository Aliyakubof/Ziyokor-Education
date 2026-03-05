import { Pool } from 'pg';

const NEON_URL = 'postgresql://neondb_owner:npg_kBgUWp4oz2Dm@ep-cool-sound-ago9vnzl-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

console.log('--- DB Connection Test (Neon Fallback) ---');

const pool = new Pool({
    connectionString: NEON_URL,
    ssl: { rejectUnauthorized: false }
});

async function test() {
    try {
        console.log('Connecting to Neon...');
        const res = await pool.query('SELECT NOW()');
        console.log('Success! Result:', res.rows[0]);
    } catch (err) {
        console.error('Connection failed:', err);
    } finally {
        await pool.end();
    }
}

test();
