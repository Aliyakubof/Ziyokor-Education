import { query } from './db';
import { schema } from './schema';

async function setupSchema() {
    console.log('Starting schema setup...');
    try {
        // Drop existing tables if needed (optional, but good for clean slate if partial init happened)
        // For now, just run schema. schema.sql uses CREATE TABLE IF NOT EXISTS usually?
        // Let's check schema.sql content first.
        // Assuming schema.sql has CREATE TABLE statements.

        const statements = schema
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            console.log(`Executing: ${statement.substring(0, 50)}...`);
            await query(statement);
        }
        console.log('Schema setup completed successfully.');

        // Verify teachers table
        const res = await query("SELECT count(*) FROM information_schema.tables WHERE table_name = 'teachers'");
        console.log('Teachers table exists:', res.rows[0].count > 0);

    } catch (err) {
        console.error('Error setting up schema:', err);
    }
}

setupSchema();
