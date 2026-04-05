import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

const finalConnectionString = connectionString;

if (!finalConnectionString) {
    throw new Error('DATABASE_URL is missing! Server cannot start without a database connection.');
}

const isLocalhost = finalConnectionString.includes('localhost') || finalConnectionString.includes('127.0.0.1');

export const pool = new Pool({
    connectionString: finalConnectionString,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
    max: 20,               // Neon free tier max connection limit
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000
});

pool.on('connect', (client) => {
    console.log('Database connected successfully');
    client.query("SET timezone = 'Asia/Tashkent';");
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
