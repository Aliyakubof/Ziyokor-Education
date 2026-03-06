import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.warn('DATABASE_URL NOT found in environment! Falling back to Neon.');
}

const finalConnectionString = connectionString || 'postgresql://neondb_owner:npg_kBgUWp4oz2Dm@ep-cool-sound-ago9vnzl-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const isLocalhost = finalConnectionString.includes('localhost') || finalConnectionString.includes('127.0.0.1');

export const pool = new Pool({
    connectionString: finalConnectionString,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
    max: 50,
    idleTimeoutMillis: 10000
});

pool.on('connect', (client) => {
    console.log('Database connected successfully');
    client.query("SET timezone = 'Asia/Tashkent';");
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
