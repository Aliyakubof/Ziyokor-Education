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

        if (result.rowCount === 0) return res.json(null);
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

        if (result.rowCount === 0) return res.json(null);
        
        const battle = result.rows[0];

        // Fetch members for Group A
        const membersARes = await query(`
            SELECT id, name, weekly_battle_score, coins, avatar_url 
            FROM students 
            WHERE group_id = $1 
            ORDER BY weekly_battle_score DESC
        `, [battle.group_a_id]);

        // Fetch members for Group B
        const membersBRes = await query(`
            SELECT id, name, weekly_battle_score, coins, avatar_url 
            FROM students 
            WHERE group_id = $1 
            ORDER BY weekly_battle_score DESC
        `, [battle.group_b_id]);

        res.json({
            ...battle,
            membersA: membersARes.rows,
            membersB: membersBRes.rows
        });
    } catch (err) {
        console.error('Error fetching battle details:', err);
        res.status(500).json({ error: 'Error fetching battle' });
    }
};

export const getBattleLeaderboard = async (req: Request, res: Response) => {
    try {
        const result = await query(`
            SELECT b.id, b.score_a, b.score_b, b.status, b.week_start, g1.name as group_a_name, g1.level, g2.name as group_b_name
            FROM group_battles b
            JOIN groups g1 ON b.group_a_id = g1.id
            JOIN groups g2 ON b.group_b_id = g2.id
            WHERE b.status = 'active' ORDER BY (b.score_a + b.score_b) DESC LIMIT 20
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching battle leaderboard:', err);
        res.status(500).json({ error: 'Error fetching battle leaderboard' });
    }
};

export const getBatchCurrentBattles = async (req: Request, res: Response) => {
    try {
        const { groupIds } = req.body;
        if (!Array.isArray(groupIds)) {
            return res.status(400).json({ error: 'groupIds must be an array' });
        }

        if (groupIds.length === 0) return res.json({});

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
            WHERE (gb.group_a_id = ANY($1) OR gb.group_b_id = ANY($1)) 
            AND gb.status = 'active'
        `, [groupIds]);

        const battleMap: Record<string, any> = {};
        result.rows.forEach(battle => {
            // Battle could belong to multiple requested groups
            if (groupIds.includes(battle.group_a_id)) {
                battleMap[battle.group_a_id] = battle;
            }
            if (groupIds.includes(battle.group_b_id)) {
                battleMap[battle.group_b_id] = battle;
            }
        });

        res.json(battleMap);
    } catch (err) {
        console.error('Error fetching batch current battles:', err);
        res.status(500).json({ error: 'Error fetching batch current battles' });
    }
};
