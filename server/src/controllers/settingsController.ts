import { Request, Response } from 'express';
import { query } from '../db';

export const getAllSettings = async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT key, value, description, updated_at FROM system_settings ORDER BY key');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching settings:', err);
        res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
};

export const getSettingByKey = async (req: Request, res: Response) => {
    try {
        const { key } = req.params;
        const result = await query('SELECT value FROM system_settings WHERE key = $1', [key]);
        if (result.rowCount === 0) {
            return res.json({ value: null });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching public setting:', err);
        res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
};

export const updateSetting = async (req: Request, res: Response) => {
    try {
        const { key } = req.params;
        const { value } = req.body;
        await query(
            'INSERT INTO system_settings (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()',
            [key, JSON.stringify(value)]
        );
        res.json({ success: true, key, value });
    } catch (err) {
        console.error('Error updating setting:', err);
        res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
};
