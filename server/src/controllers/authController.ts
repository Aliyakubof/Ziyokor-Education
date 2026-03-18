import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db';
import { generateToken } from '../middleware/auth';

const ADMIN_ID = '00000000-0000-0000-0000-000000000000';
const MANAGER_ID = '00000000-0000-0000-0000-000000000001';

export const login = async (req: Request, res: Response) => {
    const { phone: rawPhone, password } = req.body;
    const phone = String(rawPhone || '').replace(/\D/g, '');

    const adminPhone = (process.env.ADMIN_PHONE || '998901234567').replace(/\D/g, '');
    const adminPassword = process.env.ADMIN_PASSWORD || '';
    const managerPhone = (process.env.MANAGER_PHONE || '998947212531').replace(/\D/g, '');
    const managerPassword = process.env.MANAGER_PASSWORD || '';

    // Admin Login
    if (phone === adminPhone && password === adminPassword) {
        const user = { id: ADMIN_ID, name: 'Admin', phone: adminPhone, role: 'admin' };
        const token = generateToken(user);
        sendAuthCookie(res, token);
        return res.json({ user, role: 'admin' });
    }

    // Manager Login
    if (phone === managerPhone && password === managerPassword) {
        const user = { id: MANAGER_ID, name: 'Menejer', phone: managerPhone, role: 'manager' };
        const token = generateToken(user);
        sendAuthCookie(res, token);
        return res.json({ user, role: 'manager' });
    }

    // Teacher/Student Login from Database
    try {
        const result = await query(
            'SELECT id, name, phone, password FROM teachers WHERE REPLACE(phone, \'+\', \'\') = $1',
            [phone]
        );

        if (result.rowCount && result.rowCount > 0) {
            const teacher = result.rows[0];
            const match = await bcrypt.compare(password, teacher.password).catch(() => false);

            if (match) {
                const { password: _, ...teacherPayload } = teacher;
                const user = { ...teacherPayload, role: 'teacher' };
                const token = generateToken(user);
                sendAuthCookie(res, token);
                return res.json({ user, role: 'teacher' });
            }
        }

        res.status(401).json({ error: 'Telefon raqam yoki parol noto\'g\'ri' });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
    }
};

export const logout = (req: Request, res: Response) => {
    res.clearCookie('ziyokor_token');
    res.json({ success: true });
};

const sendAuthCookie = (res: Response, token: string) => {
    res.cookie('ziyokor_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
};
