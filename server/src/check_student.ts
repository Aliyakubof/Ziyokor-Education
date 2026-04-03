import { query } from './db';

async function check() {
    try {
        const studentId = '5517353';
        const res = await query('SELECT * FROM extra_class_bookings WHERE student_id = $1', [studentId]);
        console.log('Bookings for student:', res.rows);
        
        const countRes = await query('SELECT booking_date, time_slot, count(*) FROM extra_class_bookings GROUP BY booking_date, time_slot');
        console.log('Slot counts:', countRes.rows);
        
        const nowInTas = await query("SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tashkent') as now_tas, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tashkent')::date as today_tas");
        console.log('DB Time (Tashkent):', nowInTas.rows[0]);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

check();
