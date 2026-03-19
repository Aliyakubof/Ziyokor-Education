import { query } from './db';
import * as quizController from './controllers/quizController';

async function testController() {
    try {
        console.log('--- Testing API Controller ---');
        
        // --- 1. Quiz Test ---
        const res = await query('SELECT id FROM duel_quizzes LIMIT 1');
        let quizId = res.rows[0]?.id;
        if (!quizId) {
            quizId = '00000000-0000-0000-0000-000000000001';
            await query('INSERT INTO duel_quizzes (id, title, questions, daraja) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING', 
                [quizId, 'Test Duel', '[]', 'Beginner']);
        }
        await runQuizTest(quizId);

        // --- 2. Student Test ---
        const sRes = await query('SELECT id, name, group_id FROM students LIMIT 1');
        if (sRes && sRes.rowCount && sRes.rowCount > 0) {

            const student = sRes.rows[0];
            await runStudentTest(student);
        } else {
            console.log('No students found to test student update/move.');
        }
        
    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        process.exit(0);
    }
}

async function runQuizTest(id: string) {
    console.log('\nTesting getDuelQuizById (' + id + ')');
    const mockReq = { params: { id } } as any;
    const { status, data } = await callController(quizController.getDuelQuizById, mockReq);
    console.log('Status:', status, 'Data ID:', data?.id);
    if (status === 200 && data?.id === id) console.log('✅ getDuelQuizById passed!');
    else console.error('❌ getDuelQuizById failed!');
}

import * as teacherController from './controllers/teacherController';

async function runStudentTest(student: any) {
    console.log('\nTesting updateStudent (' + student.id + ')');
    const mockReqEdit = {
        params: { id: student.id },
        body: {
            name: student.name + ' (Updated)',
            phone: '998901234567',
            parent_name: 'Parent Name',
            parent_phone: '998907654321'
        }
    } as any;
    const { status: s1, data: d1 } = await callController(teacherController.updateStudent, mockReqEdit);
    console.log('Update Status:', s1, 'New Name:', d1?.name);
    if (s1 === 200 && d1?.name.includes('(Updated)')) console.log('✅ updateStudent passed!');
    else console.error('❌ updateStudent failed!');

    console.log('\nTesting moveStudent (' + student.id + ')');
    const mockReqMove = {
        params: { id: student.id },
        body: { newGroupId: student.group_id } // Move to self for test
    } as any;
    const { status: s2, data: d2 } = await callController(teacherController.moveStudent, mockReqMove);
    console.log('Move Status:', s2, 'Data:', d2);
    if (s2 === 200 && d2?.success) console.log('✅ moveStudent passed!');
    else console.error('❌ moveStudent failed!');
}

async function callController(fn: any, req: any) {
    let responseData: any = null;
    let responseStatus: number = 200;
    const res = {
        status: (s: number) => { responseStatus = s; return res; },
        json: (data: any) => { responseData = data; return res; },
        send: (msg: string) => { responseData = msg; return res; }
    } as any;
    await fn(req, res);
    return { status: responseStatus, data: responseData };
}

testController();

