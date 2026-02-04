import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_kBgUWp4oz2Dm@ep-cool-sound-ago9vnzl-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

try {
    const dbUrl = new URL(connectionString);
    console.log('Attempting to connect to database host:', dbUrl.hostname);
} catch (err) {
    console.log('Attempting to connect using a custom connection string (not a standard URL)');
}

console.log('PostgreSQL Pool creating with connection string (redacted):', connectionString.replace(/:[^:@]+@/, ':****@').substring(0, 50) + '...');
export const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
});

pool.on('connect', () => {
    console.log('Database connected successfully');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
