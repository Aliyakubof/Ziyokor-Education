import { query } from './db';

async function checkData() {
    try {
        const groups = await query('SELECT * FROM groups');
        console.log('Groups:');
        console.table(groups.rows);

        const teachers = await query('SELECT id, name, phone FROM teachers');
        console.log('Teachers:');
        console.table(teachers.rows);

        const students = await query('SELECT id, name, group_id FROM students');
        console.log('Students:');
        console.table(students.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkData();
