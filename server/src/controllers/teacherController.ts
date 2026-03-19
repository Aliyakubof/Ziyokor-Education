import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db';
import { ADMIN_ID } from '../constants';
import { notifyTeacher } from '../bot';
import { generateStudentId, generateParentId } from '../store';
import { generateWeeklyTeacherReportPDF } from '../pdfGenerator';

export const getTeacherStats = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const g = await query('SELECT COUNT(*) FROM groups WHERE teacher_id = $1', [id]);
        const q = await query('SELECT COUNT(*) FROM unit_quizzes');
        res.json({
            teachers: 0,
            groups: parseInt(g.rows[0].count),
            quizzes: parseInt(q.rows[0].count)
        });
    } catch (err) {
        console.error('Error fetching teacher stats:', err);
        res.status(500).json({ error: 'Error fetching teacher stats' });
    }
};

export const getGroups = async (req: Request, res: Response) => {
    try {
        const result = await query(`
            SELECT g.*, t.name as teacher_name 
            FROM groups g 
            LEFT JOIN teachers t ON g.teacher_id = t.id
        `);
        res.json(result.rows);
    } catch (err: any) {
        console.error('Error fetching groups:', err);
        res.status(500).json({ error: 'Error fetching groups', details: err.message });
    }
};

export const getTeacherGroups = async (req: Request, res: Response) => {
    try {
        const { teacherId } = req.params;
        const result = await query('SELECT * FROM groups WHERE teacher_id = $1', [teacherId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching teacher groups' });
    }
};

export const getGroupById = async (req: Request, res: Response) => {
    try {
        const { groupId } = req.params;
        const result = await query('SELECT * FROM groups WHERE id = $1', [groupId]);
        if (result.rowCount === 0) return res.json(null);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching group' });
    }
};

export const getGroupResults = async (req: Request, res: Response) => {
    try {
        const { groupId } = req.params;
        const result = await query(
            'SELECT * FROM game_results WHERE group_id = $1 ORDER BY created_at DESC',
            [groupId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching group results' });
    }
};

export const updateStudentContact = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { relative } = req.body;
        const logId = uuidv4();
        await query(
            'UPDATE students SET last_contacted_relative = $1, last_contacted_at = NOW() WHERE id = $2',
            [relative, id]
        );
        await query(
            'INSERT INTO contact_logs (id, student_id, relative, contacted_at) VALUES ($1, $2, $3, NOW())',
            [logId, id, relative]
        );
        res.json({ success: true, relative, contactedAt: new Date() });
    } catch (err) {
        res.status(500).json({ error: 'Error updating contact info' });
    }
};

export const getStudentContactLogs = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await query(
            'SELECT * FROM contact_logs WHERE student_id = $1 ORDER BY contacted_at DESC',
            [id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching contact logs' });
    }
};

export const getGroupContactLogs = async (req: Request, res: Response) => {
    try {
        const { groupId } = req.params;
        const filter = req.query.filter as string;
        let sinceDate: Date;
        const now = new Date();
        if (filter === 'today') {
            sinceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        } else if (filter === 'week') {
            sinceDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else {
            sinceDate = new Date(0);
        }

        const result = await query(`
            SELECT
                cl.id, cl.relative, cl.contacted_at,
                s.name AS student_name, s.parent_name, s.parent_phone,
                g.name AS group_name
            FROM contact_logs cl
            JOIN students s ON cl.student_id = s.id
            JOIN groups g ON s.group_id = g.id
            WHERE s.group_id = $1 AND cl.contacted_at >= $2
            ORDER BY cl.contacted_at DESC
        `, [groupId, sinceDate]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching group contact logs' });
    }
};

export const createStudent = async (req: Request, res: Response) => {
    try {
        const { name, groupId, phone, parentName, parentPhone } = req.body;
        const id = await generateStudentId();
        const parentId = await generateParentId();
        await query(
            'INSERT INTO students (id, name, group_id, phone, parent_name, parent_phone, parent_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [id, name, groupId, phone, parentName, parentPhone, parentId]
        );

        try {
            const teacherRes = await query(`
                SELECT t.telegram_chat_id, g.name as group_name 
                FROM teachers t 
                JOIN groups g ON t.id = g.teacher_id 
                WHERE g.id = $1
            `, [groupId]);
            if (teacherRes.rows[0]?.telegram_chat_id) {
                await notifyTeacher(teacherRes.rows[0].telegram_chat_id, `🆕 <b>Yangi o'quvchi qo'shildi!</b>\n👤 Ism: ${name}\n🏫 Guruh: ${teacherRes.rows[0].group_name}\n📞 Tel: ${phone}`);
            }
        } catch (e) {
            console.error('Error notifying teacher about new student:', e);
        }

        res.json({ id, parentId, name, groupId, phone, parentName, parentPhone, status: 'Offline' });
    } catch (err) {
        res.status(500).json({ error: 'Error creating student' });
    }
};

export const searchStudents = async (req: Request, res: Response) => {
    try {
        const { q, teacherId, role } = req.query;
        if (!q) return res.json([]);

        let queryStr = `
            SELECT s.id, s.name, s.group_id, g.name as group_name, g.teacher_id
            FROM students s
            JOIN groups g ON s.group_id = g.id
            WHERE (s.name ILIKE $1 OR s.id ILIKE $1)
        `;
        const params: any[] = [`%${q}%`];

        if (role === 'teacher' || (teacherId && teacherId !== ADMIN_ID)) {
            if (!teacherId || teacherId === 'null' || teacherId === 'undefined') {
                return res.json([]);
            }
            queryStr += ` AND g.teacher_id = $2::uuid`;
            params.push(teacherId);
        }

        queryStr += ` LIMIT 20`;
        const result = await query(queryStr, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({ error: 'Error searching students' });
    }
};

export const getStudentsByGroup = async (req: Request, res: Response) => {
    try {
        const { groupId } = req.params;
        const result = await query('SELECT * FROM students WHERE group_id = $1', [groupId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching students' });
    }
};

export const deleteStudent = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await query('UPDATE group_battles SET mvp_id = NULL WHERE mvp_id = $1', [id]);
        await query('DELETE FROM contact_logs WHERE student_id = $1', [id]);
        await query('DELETE FROM student_purchases WHERE student_id = $1', [id]);
        await query('DELETE FROM student_telegram_subscriptions WHERE student_id = $1', [id]);
        const result = await query('DELETE FROM students WHERE id = $1', [id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Student not found' });
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting student:', err);
        res.status(500).json({ error: 'Error deleting student' });
    }
};

export const moveStudent = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { newGroupId } = req.body;
        const result = await query('UPDATE students SET group_id = $1 WHERE id = $2', [newGroupId, id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Student not found or not updated' });
        res.json({ success: true });
    } catch (err) {
        console.error('Error moving student:', err);
        res.status(500).json({ error: 'Error moving student' });
    }
};

export const updateStudent = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, phone, parent_name, parent_phone } = req.body;
        const result = await query(
            'UPDATE students SET name = $1, phone = $2, parent_name = $3, parent_phone = $4 WHERE id = $5 RETURNING *',
            [name, phone, parent_name, parent_phone, id]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'Student not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating student:', err);
        res.status(500).json({ error: 'Error updating student' });
    }
};

// Groups
export const createGroup = async (req: Request, res: Response) => {
    try {
        const { name, teacherId, level, extraClassDays, extraClassTimes } = req.body;
        const id = uuidv4();
        await query('INSERT INTO groups (id, name, teacher_id, level, extra_class_days, extra_class_times) VALUES ($1, $2, $3, $4, $5, $6)', [id, name, teacherId, level || 'Beginner', extraClassDays || [], extraClassTimes || []]);
        res.json({ id, name, teacherId, level, extraClassDays, extraClassTimes });
    } catch (err) {
        res.status(500).json({ error: 'Error creating group' });
    }
};

export const updateGroup = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, level, teacherId, extraClassDays, extraClassTimes } = req.body;
        await query(`UPDATE groups SET name = $1, level = $2, teacher_id = COALESCE($3, teacher_id), extra_class_days = $4, extra_class_times = $5 WHERE id = $6`, [name, level, teacherId || null, extraClassDays || [], extraClassTimes || [], id]);
        res.json({ success: true, id, name, level, teacherId, extraClassDays, extraClassTimes });
    } catch (err) {
        res.status(500).json({ error: 'Error updating group' });
    }
};

export const deleteGroup = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const check = await query('SELECT * FROM groups WHERE id = $1', [id]);
        if (check.rowCount === 0) return res.status(404).json({ error: 'Group not found' });
        await query('DELETE FROM groups WHERE id = $1', [id]);
        res.json({ success: true, id });
    } catch (err) {
        res.status(500).json({ error: 'Error deleting group' });
    }
};

export const getGroupStudentsShort = async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT id, name, avatar_url FROM students WHERE group_id = $1 ORDER BY name ASC', [req.params.groupId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Xatolik' });
    }
};

// Extra Class Bookings
export const getExtraClassBookings = async (req: Request, res: Response) => {
    try {
        const result = await query(`SELECT b.*, s.name as student_name FROM extra_class_bookings b JOIN students s ON b.student_id = s.id WHERE b.group_id = $1 ORDER BY b.created_at ASC`, [req.params.groupId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Xatolik' });
    }
};

export const completeBooking = async (req: Request, res: Response) => {
    try {
        await query('UPDATE extra_class_bookings SET is_completed = $1 WHERE id = $2', [req.body.isCompleted, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Xatolik' });
    }
};

// Reports
export const getWeeklyReport = async (req: Request, res: Response) => {
    try {
        const { teacherId: queryTeacherId } = req.query;
        const targetTeacherId = queryTeacherId ? String(queryTeacherId) : (req as any).user.id;
        const userRole = (req as any).user.role;
        if (userRole === 'teacher' && targetTeacherId !== (req as any).user.id) return res.status(403).json({ error: 'Faqat o\'zingizning hisobotingizni ko\'rishingiz mumkin' });

        const tRes = await query('SELECT name FROM teachers WHERE id = $1', [targetTeacherId]);
        if (tRes.rowCount === 0) return res.status(404).json({ error: 'O\'qituvchi topilmadi' });
        const teacherName = tRes.rows[0].name;

        const startDate = new Date(); startDate.setDate(startDate.getDate() - 7);
        const startDateStr = startDate.toLocaleDateString('uz-UZ');
        const endDateStr = new Date().toLocaleDateString('uz-UZ');

        const bookingsRes = await query(`
            SELECT ecb.*, g.name as group_name, s.name as student_name FROM extra_class_bookings ecb 
            JOIN groups g ON ecb.group_id = g.id JOIN students s ON ecb.student_id = s.id 
            WHERE g.teacher_id = $1 AND ecb.is_completed = true AND ecb.created_at >= NOW() - INTERVAL '7 days' 
            ORDER BY ecb.created_at DESC
        `, [targetTeacherId]);

        const pdfBuffer = await generateWeeklyTeacherReportPDF(teacherName, startDateStr, endDateStr, bookingsRes.rows);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=weekly-report-${encodeURIComponent(teacherName)}.pdf`);
        res.send(pdfBuffer);
    } catch (err: any) {
        console.error('Error generating weekly report:', err);
        res.status(500).json({ error: 'Xatolik', details: err.message });
    }
};
