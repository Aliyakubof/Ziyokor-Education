import { query } from './db';
import bcrypt from 'bcrypt';

async function migratePasswords() {
    console.log('Starting Password Bcrypt Migration...');

    try {
        // Migrate Teachers
        console.log('Fetching teachers...');
        const teachersResult = await query('SELECT id, password FROM teachers WHERE password IS NOT NULL');
        let teachersMigrated = 0;

        for (const teacher of teachersResult.rows) {
            // Check if it's already a bcrypt hash (starts with $2b$ or $2a$)
            if (!teacher.password.startsWith('$2')) {
                const hashedPassword = await bcrypt.hash(teacher.password, 10);
                await query('UPDATE teachers SET password = $1 WHERE id = $2', [hashedPassword, teacher.id]);
                teachersMigrated++;
            }
        }
        console.log(`Migrated ${teachersMigrated} teacher passwords.`);

        // Migrate Students
        console.log('Fetching students...');
        const studentsResult = await query('SELECT id, password FROM students WHERE password IS NOT NULL');
        let studentsMigrated = 0;

        for (const student of studentsResult.rows) {
            if (!student.password.startsWith('$2')) {
                const hashedPassword = await bcrypt.hash(student.password, 10);
                await query('UPDATE students SET password = $1 WHERE id = $2', [hashedPassword, student.id]);
                studentsMigrated++;
            }
        }
        console.log(`Migrated ${studentsMigrated} student passwords.`);

        console.log('Migration Completed Successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit(0);
    }
}

migratePasswords();
