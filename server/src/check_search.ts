import { query } from './db';

async function checkData() {
    try {
        console.log('--- Students ---');
        const students = await query('SELECT * FROM students LIMIT 10');
        console.table(students.rows);

        console.log('\n--- Groups ---');
        const groups = await query('SELECT * FROM groups LIMIT 10');
        console.table(groups.rows);

        if (students.rows.length > 0) {
            const student = students.rows[0];
            console.log(`\nTesting search for: ${student.name.substring(0, 3)}`);
            const searchResult = await query(`
                SELECT s.id, s.name, s.group_id, g.name as group_name
                FROM students s
                JOIN groups g ON s.group_id = g.id
                WHERE s.name ILIKE $1 OR s.id ILIKE $1
            `, [`%${student.name.substring(0, 3)}%`]);
            console.log('Search Results:');
            console.table(searchResult.rows);
        }
    } catch (err) {
        console.error('Error checking data:', err);
    }
}

checkData();
