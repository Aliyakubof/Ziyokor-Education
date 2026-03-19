import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db';
import { ADMIN_ID } from '../constants';
import { generateGroupContactPDF } from '../pdfGenerator';
import { SettingsService } from '../services/settings';

export const getAdminStats = async (req: Request, res: Response) => {
    try {
        const t = await query('SELECT COUNT(*) FROM teachers');
        const g = await query('SELECT COUNT(*) FROM groups');
        const q = await query('SELECT COUNT(*) FROM unit_quizzes');
        res.json({
            teachers: parseInt(t.rows[0].count),
            groups: parseInt(g.rows[0].count),
            quizzes: parseInt(q.rows[0].count)
        });
    } catch (err) {
        console.error('Error fetching admin stats:', err);
        res.status(500).json({ error: 'Error fetching admin stats' });
    }
};

export const getTeachersList = async (req: Request, res: Response) => {
    try {
        const result = await query(`
            SELECT 
                t.*, 
                COUNT(DISTINCT g.id) as group_count,
                COUNT(DISTINCT s.id) as student_count
            FROM teachers t
            LEFT JOIN groups g ON t.id = g.teacher_id
            LEFT JOIN students s ON g.id = s.group_id
            GROUP BY t.id
            ORDER BY t.name ASC
        `);
        res.json(result.rows);
    } catch (err: any) {
        console.error('Error fetching teachers list:', err);
        res.status(500).json({ error: 'Error fetching teachers lists', details: err.message });
    }
};

export const createTeacher = async (req: Request, res: Response) => {
    try {
        const { name, phone, password } = req.body;
        const rawPassword = password || phone.slice(-4);
        const hashedPassword = await bcrypt.hash(rawPassword, 10);
        const id = uuidv4();
        await query(
            'INSERT INTO teachers (id, name, phone, password, plain_password) VALUES ($1, $2, $3, $4, $5)',
            [id, name, phone, hashedPassword, rawPassword]
        );
        res.json({ id, name, phone, password: rawPassword });
    } catch (err) {
        console.error('Error creating teacher:', err);
        res.status(500).json({ error: 'Error creating teacher' });
    }
};

export const updateTeacher = async (req: Request, res: Response) => {
    try {
        const { name, phone, password } = req.body;
        const { id } = req.params;
        const finalPassword = password?.startsWith('$2') ? password : await bcrypt.hash(password, 10);
        const plainPass = password?.startsWith('$2') ? null : password;

        if (plainPass) {
            await query(
                'UPDATE teachers SET name = $1, phone = $2, password = $3, plain_password = $4 WHERE id = $5',
                [name, phone, finalPassword, plainPass, id]
            );
        } else {
            await query(
                'UPDATE teachers SET name = $1, phone = $2 WHERE id = $3',
                [name, phone, id]
            );
        }
        res.json({ id, name, phone, password: plainPass || password });
    } catch (err) {
        console.error('Error updating teacher:', err);
        res.status(500).json({ error: 'Error updating teacher' });
    }
};

export const deleteTeacher = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await query('DELETE FROM teachers WHERE id = $1', [id]);
        res.json({ success: true, id });
    } catch (err) {
        console.error('Error deleting teacher:', err);
        res.status(500).json({ error: 'Error deleting teacher' });
    }
};

export const getStudentsWithPagination = async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const countResult = await query('SELECT COUNT(*) FROM students');
        const total = parseInt(countResult.rows[0].count);

        const result = await query(`
            SELECT s.*, g.name as group_name, t.name as teacher_name
            FROM students s
            LEFT JOIN groups g ON s.group_id = g.id
            LEFT JOIN teachers t ON g.teacher_id = t.id
            ORDER BY s.name ASC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        res.json({
            students: result.rows.map(row => ({ ...row, password: row.plain_password || row.password })),
            total,
            limit,
            offset
        });
    } catch (err: any) {
        console.error('Error fetching admin students:', err);
        res.status(500).json({ error: 'Error fetching students', details: err.message });
    }
};

// Vocabulary Battles
export const getVocabBattles = async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM vocabulary_battles ORDER BY daraja, level');
        res.json(result.rows);
    } catch (err: any) {
        console.error('Error fetching vocab battles:', err);
        res.status(500).json({ error: 'Error fetching vocab battles', details: err.message });
    }
};

export const createVocabBattle = async (req: Request, res: Response) => {
    try {
        const { daraja, level, title, questions } = req.body;
        const id = uuidv4();
        await query(
            'INSERT INTO vocabulary_battles (id, daraja, level, title, questions) VALUES ($1, $2, $3, $4, $5)',
            [id, daraja, level, title, JSON.stringify(questions)]
        );
        res.json({ id, daraja, level, title });
    } catch (err: any) {
        console.error('Error creating vocab battle:', err);
        res.status(500).json({ error: 'Error creating vocab battle', details: err.message });
    }
};

export const updateVocabBattle = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { daraja, level, title, questions } = req.body;
        await query(
            'UPDATE vocabulary_battles SET daraja = $1, level = $2, title = $3, questions = $4 WHERE id = $5',
            [daraja, level, title, JSON.stringify(questions), id]
        );
        res.json({ id, daraja, level, title });
    } catch (err: any) {
        console.error('Error updating vocab battle:', err);
        res.status(500).json({ error: 'Error updating vocab battle', details: err.message });
    }
};

export const getVocabBattleById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await query('SELECT * FROM vocabulary_battles WHERE id = $1', [id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Topilmadi' });
        res.json(result.rows[0]);
    } catch (err: any) {
        console.error('Error fetching vocab battle:', err);
        res.status(500).json({ error: 'Xatolik', details: err.message });
    }
};

export const deleteVocabBattle = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await query('DELETE FROM vocabulary_battles WHERE id = $1', [id]);
        res.json({ success: true, id });
    } catch (err: any) {
        console.error('Error deleting vocab battle:', err);
        res.status(500).json({ error: 'Error deleting vocab battle', details: err.message });
    }
};

// Telegram Questions
export const getTelegramQuestions = async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM telegram_questions ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err: any) {
        console.error('Error fetching telegram questions:', err);
        res.status(500).json({ error: 'Error fetching telegram questions', details: err.message });
    }
};

export const createTelegramQuestion = async (req: Request, res: Response) => {
    try {
        const { text, options, correct_index, level } = req.body;
        const id = uuidv4();
        await query(
            'INSERT INTO telegram_questions (id, text, options, correct_index, level) VALUES ($1, $2, $3, $4, $5)',
            [id, text, JSON.stringify(options), correct_index, level || 'General']
        );
        res.json({ id, text, options, correct_index, level });
    } catch (err: any) {
        console.error('Error creating telegram question:', err);
        res.status(500).json({ error: 'Error creating telegram question', details: err.message });
    }
};

export const updateTelegramQuestion = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { text, options, correct_index, level } = req.body;
        await query(
            'UPDATE telegram_questions SET text = $1, options = $2, correct_index = $3, level = $4 WHERE id = $5',
            [text, JSON.stringify(options), correct_index, level, id]
        );
        res.json({ id, text, options, correct_index, level });
    } catch (err: any) {
        console.error('Error updating telegram question:', err);
        res.status(500).json({ error: 'Error updating telegram question', details: err.message });
    }
};

export const deleteTelegramQuestion = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await query('DELETE FROM telegram_questions WHERE id = $1', [id]);
        res.json({ success: true, id });
    } catch (err: any) {
        console.error('Error deleting telegram question:', err);
        res.status(500).json({ error: 'Error deleting telegram question', details: err.message });
    }
};

// System Settings
export const getAdminSetting = async (req: Request, res: Response) => {
    try {
        const { key } = req.params;
        const result = await query('SELECT value FROM system_settings WHERE key = $1', [key]);
        if (result.rowCount === 0) return res.json({ value: null });
        res.json({ value: result.rows[0].value });
    } catch (err) {
        res.status(500).json({ error: 'Error fetching setting' });
    }
};

export const updateAdminSetting = async (req: Request, res: Response) => {
    try {
        const { key, value } = req.body;
        await query(
            'INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()',
            [key, JSON.stringify(value)]
        );
        await SettingsService.refreshCache();
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating setting:', err);
        res.status(500).json({ error: 'Error updating setting' });
    }
};

// Available Slots
export const getAvailableSlots = async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM available_slots ORDER BY created_at ASC');
        res.json(result.rows);
    } catch (err: any) {
        console.error('Error fetching slots:', err);
        res.status(500).json({ error: 'Error fetching slots', details: err.message });
    }
};

export const createAvailableSlot = async (req: Request, res: Response) => {
    try {
        const { time_text, day_of_week } = req.body;
        const id = uuidv4();
        await query(
            'INSERT INTO available_slots (id, time_text, day_of_week) VALUES ($1, $2, $3)',
            [id, time_text, day_of_week]
        );
        res.json({ id, time_text, day_of_week });
    } catch (err: any) {
        console.error('Error creating slot:', err);
        res.status(500).json({ error: 'Error creating slot', details: err.message });
    }
};

export const updateAvailableSlot = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { time_text, day_of_week } = req.body;
        await query(
            'UPDATE available_slots SET time_text = $1, day_of_week = $2 WHERE id = $3',
            [time_text, day_of_week, id]
        );
        res.json({ id, time_text, day_of_week });
    } catch (err: any) {
        console.error('Error updating slot:', err);
        res.status(500).json({ error: 'Error updating slot', details: err.message });
    }
};

export const deleteAvailableSlot = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await query('DELETE FROM available_slots WHERE id = $1', [id]);
        res.json({ success: true, id });
    } catch (err: any) {
        console.error('Error deleting slot:', err);
        res.status(500).json({ error: 'Error deleting slot', details: err.message });
    }
};

// Level Topics
export const getLevelTopics = async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM level_topics ORDER BY level, created_at');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Xatolik' });
    }
};

export const createLevelTopic = async (req: Request, res: Response) => {
    try {
        const { level, topicName } = req.body;
        const id = uuidv4();
        await query('INSERT INTO level_topics (id, level, topic_name) VALUES ($1, $2, $3)', [id, level, topicName]);
        res.json({ success: true, id });
    } catch (err) {
        res.status(500).json({ error: 'Xatolik' });
    }
};

export const deleteLevelTopic = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await query('DELETE FROM level_topics WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Xatolik' });
    }
};

export const uploadImage = async (req: Request, res: Response) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Rasm yuklanmadi' });
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({ url: fileUrl });
    } catch (err: any) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Yuklashda xatolik' });
    }
};
