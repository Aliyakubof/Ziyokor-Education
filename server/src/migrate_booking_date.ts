import { query } from './db';

async function migrate() {
    console.log('Adding booking_date column to extra_class_bookings...');
    try {
        await query(`
            ALTER TABLE extra_class_bookings 
            ADD COLUMN IF NOT EXISTS booking_date DATE;
        `);
        console.log('Done! booking_date column added.');
        process.exit(0);
    } catch (err) {
        console.error('Migration error:', err);
        process.exit(1);
    }
}

migrate();
