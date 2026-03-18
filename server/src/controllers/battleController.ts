import { Request, Response } from 'express';
import { query } from '../db';

export const getCurrentBattle = async (req: Request, res: Response) => {
    try {
        const { groupId } = req.params;
        const result = await query(`
            SELECT 
                gb.*, 
                g1.name as group_a_name, 
                g2.name as group_b_name, 
                t1.name as teacher_a_name, 
                t2.name as teacher_b_name
            FROM group_battles gb
            JOIN groups g1 ON gb.group_a_id = g1.id
            JOIN groups g2 ON gb.group_b_id = g2.id
            LEFT JOIN teachers t1 ON g1.teacher_id = t1.id
            LEFT JOIN teachers t2 ON g2.teacher_id = t2.id
            WHERE (gb.group_a_id = $1 OR gb.group_b_id = $1) 
            AND gb.status = 'active'
            LIMIT 1
        `, [groupId]);

        if (result.rowCount === 0) return res.status(404).json({ error: 'No active battle' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching current battle:', err);
        res.status(500).json({ error: 'Error fetching current battle' });
    }
};

export const getBattleById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await query(`
            SELECT 
                gb.*, 
                g1.name as group_a_name, 
                g2.name as group_b_name, 
                t1.name as teacher_a_name, 
                t2.name as teacher_b_name
            FROM group_battles gb
            JOIN groups g1 ON gb.group_a_id = g1.id
            JOIN groups g2 ON gb.group_b_id = g2.id
            LEFT JOIN teachers t1 ON g1.teacher_id = t1.id
            LEFT JOIN teachers t2 ON g2.teacher_id = t2.id
            WHERE gb.id = $1
        `, [id]);

        if (result.rowCount === 0) return res.status(404).json({ error: 'Battle not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching battle' });
    }
};
