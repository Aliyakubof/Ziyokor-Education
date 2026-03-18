import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db';

export const getItems = async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM shop_items WHERE is_active = TRUE ORDER BY price ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching shop items:', err);
        res.status(500).json({ error: 'Do\'kon yuklanmadi' });
    }
};

export const purchaseItem = async (req: Request, res: Response) => {
    try {
        const { studentId, itemId } = req.body;

        const itemRes = await query('SELECT * FROM shop_items WHERE id = $1 AND is_active = TRUE', [itemId]);
        if (itemRes.rowCount === 0) return res.status(404).json({ error: 'Item not found' });
        const item = itemRes.rows[0];

        const studentRes = await query('SELECT coins FROM students WHERE id = $1', [studentId]);
        if (studentRes.rowCount === 0) return res.status(404).json({ error: 'Student not found' });

        const student = studentRes.rows[0];
        if (student.coins < item.price) {
            return res.status(400).json({ error: 'Mablag\' yetarli emas' });
        }

        if (item.is_one_time) {
            const alreadyPurchasedRes = await query(
                'SELECT 1 FROM student_purchases WHERE student_id = $1 AND item_id = $2 LIMIT 1',
                [studentId, itemId]
            );
            if (alreadyPurchasedRes.rowCount && alreadyPurchasedRes.rowCount > 0) {
                return res.status(400).json({ error: 'Bu mahsulot allaqachon sotib olingan' });
            }
        }

        const newCoinsCount = student.coins - item.price;
        await query('UPDATE students SET coins = $1 WHERE id = $2', [newCoinsCount, studentId]);
        await query(
            'INSERT INTO student_purchases (id, student_id, item_type, item_id) VALUES ($1, $2, $3, $4)',
            [uuidv4(), studentId, item.type, itemId]
        );

        if (item.type === 'avatar' && item.url) {
            await query('UPDATE students SET avatar_url = $1 WHERE id = $2', [item.url, studentId]);
        }

        res.json({ success: true, newCoins: newCoinsCount });
    } catch (err) {
        console.error('Purchase error:', err);
        res.status(500).json({ error: 'Xarid amalga oshmadi' });
    }
};

export const getPurchases = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await query('SELECT item_id, item_type FROM student_purchases WHERE student_id = $1', [id]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching purchases:', err);
        res.status(500).json({ error: 'Xaridlarni yuklab bo\'lmadi' });
    }
};

export const getManagerShopItems = async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM shop_items ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err: any) {
        console.error('Error fetching manager shop items:', err);
        res.status(500).json({ error: 'Xatolik', details: err.message });
    }
};

export const createShopItem = async (req: Request, res: Response) => {
    try {
        const { name, type, price, url, color, is_active, is_one_time } = req.body;
        const id = uuidv4();
        await query(
            'INSERT INTO shop_items (id, name, type, price, url, color, is_active, is_one_time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [id, name, type, price, url, color, is_active !== undefined ? is_active : true, is_one_time !== undefined ? is_one_time : true]
        );
        res.json({ id, name, type, price, url, color, is_one_time });
    } catch (err: any) {
        console.error('Error creating shop item:', err);
        res.status(500).json({ error: 'Xatolik', details: err.message });
    }
};

export const updateShopItem = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, type, price, url, color, is_active, is_one_time } = req.body;
        await query(
            'UPDATE shop_items SET name = $1, type = $2, price = $3, url = $4, color = $5, is_active = $6, is_one_time = $7 WHERE id = $8',
            [name, type, price, url, color, is_active, is_one_time, id]
        );
        res.json({ id, name, type, price, url, color, is_active, is_one_time });
    } catch (err: any) {
        console.error('Error updating shop item:', err);
        res.status(500).json({ error: 'Xatolik', details: err.message });
    }
};

export const deleteShopItem = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await query('DELETE FROM shop_items WHERE id = $1', [id]);
        res.json({ success: true, id });
    } catch (err: any) {
        console.error('Error deleting shop item:', err);
        res.status(500).json({ error: 'Xatolik', details: err.message });
    }
};
