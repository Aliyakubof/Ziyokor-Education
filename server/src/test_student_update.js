const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function testUpdate() {
    try {
        console.log('--- Student Update Test (JS) ---');

        // 1. Get a student to test with
        const initialRes = await pool.query('SELECT * FROM students LIMIT 1');
        if (initialRes.rows.length === 0) {
            console.error('No students found to test with.');
            process.exit(1);
        }
        const student = initialRes.rows[0];
        console.log(`Original Student ID: ${student.id}, Name: ${student.name}`);

        // 2. Perform Update
        const newName = `Test_${student.name}_${Date.now()}`;
        console.log(`Updating to name: ${newName}`);

        const updateRes = await pool.query(
            'UPDATE students SET name = $1, phone = $2, parent_name = $3, parent_phone = $4 WHERE id = $5 RETURNING *',
            [newName, student.phone || '998901234567', 'Test Parent', '998901234568', student.id.toString()]
        );

        if (updateRes.rows.length > 0) {
            const updated = updateRes.rows[0];
            console.log('✅ Update successful!');
            console.log(`New Name: ${updated.name}`);

            // 3. Revert change (clean up)
            await pool.query('UPDATE students SET name = $1 WHERE id = $2', [student.name, student.id.toString()]);
            console.log('🧹 Reverted changes.');
        } else {
            console.error('❌ Update failed - no rows returned.');
        }
    } catch (err) {
        console.error('❌ Error during test:', err);
    } finally {
        await pool.end();
    }
}

testUpdate();
