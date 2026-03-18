import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db';
import { generateToken } from '../middleware/auth';
import { notifyStudentSubscribers } from '../bot';

export const getLeaderboard = async (req: Request, res: Response) => {
    try {
        const { type = 'coins', limit = 50, view = 'global', groupId } = req.query;
        let queryStr = `
            SELECT s.id, s.name, s.coins, s.streak_count, s.avatar_url, g.name as group_name, g.level as group_level
            FROM students s
            LEFT JOIN groups g ON s.group_id = g.id
        `;
        const params: any[] = [];

        if (view === 'group' && groupId && groupId !== 'undefined' && groupId !== 'null') {
            queryStr += ` WHERE s.group_id = $1`;
            params.push(groupId);
        } else if (view === 'global' && groupId && groupId !== 'undefined' && groupId !== 'null') {
            queryStr += ` WHERE g.level = (SELECT level FROM groups WHERE id = $1)`;
            params.push(groupId);
        }

        if (type === 'streaks') {
            queryStr += ` ORDER BY s.streak_count DESC, s.coins DESC`;
        } else {
            queryStr += ` ORDER BY s.coins DESC, s.streak_count DESC`;
        }

        queryStr += ` LIMIT $${params.length + 1} `;
        params.push(parseInt(limit as string));

        const result = await query(queryStr, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Leaderboard error:', err);
        res.status(500).json({ error: 'Error fetching leaderboard' });
    }
};

export const checkStudentId = async (req: Request, res: Response) => {
    try {
        const { id } = req.body;
        const result = await query('SELECT id, name, password, group_id FROM students WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'O\'quvchi topilmadi' });
        }

        const student = result.rows[0];
        res.json({
            exists: true,
            hasPassword: !!student.password,
            name: student.name
        });
    } catch (err) {
        res.status(500).json({ error: 'Server xatosi' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { id, password } = req.body;

        const result = await query('SELECT s.*, g.name as group_name, t.name as teacher_name FROM students s JOIN groups g ON s.group_id = g.id LEFT JOIN teachers t ON g.teacher_id = t.id WHERE s.id = $1', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'O\'quvchi topilmadi' });
        }

        const student = result.rows[0];

        if (student.password) {
            const match = await bcrypt.compare(password, student.password);
            if (!match && student.password !== password) {
                return res.status(401).json({ error: 'Parol noto\'g\'ri' });
            }
        } else {
            const hashedPassword = await bcrypt.hash(password, 10);
            await query('UPDATE students SET password = $1 WHERE id = $2', [hashedPassword, id]);
        }

        const user = {
            id: student.id,
            name: student.name,
            groupId: student.group_id,
            groupName: student.group_name,
            teacherName: student.teacher_name,
            role: 'student'
        };
        const token = generateToken(user);
        res.cookie('ziyokor_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({ user, role: 'student' });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server xatosi' });
    }
};

export const getStats = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const studentRes = await query(`
            SELECT
                s.coins,
                s.streak_count,
                s.active_theme_id,
                s.avatar_url,
                COALESCE(s.is_hero, false) as is_hero,
                COALESCE(s.weekly_battle_score, 0) as weekly_battle_score,
                s.group_id,
                COALESCE(g.has_trophy, false) as has_trophy,
                si.color as active_theme_color
            FROM students s 
            LEFT JOIN groups g ON s.group_id = g.id 
            LEFT JOIN shop_items si ON s.active_theme_id = si.id
            WHERE s.id = $1
        `, [id]);
        
        if (studentRes.rowCount === 0) return res.status(404).json({ error: 'Student not found' });
        const student = studentRes.rows[0];

        const gamesRes = await query(`
            SELECT COUNT(*) as games_count
            FROM game_results, jsonb_array_elements(
                CASE WHEN jsonb_typeof(player_results) = 'array' THEN player_results ELSE '[]'::jsonb END
            ) as player
            WHERE player ->> 'id' = $1
        `, [id]);

        const scoreRes = await query(`
            SELECT SUM((player ->> 'score'):: int) as total_score
            FROM game_results, jsonb_array_elements(
                CASE WHEN jsonb_typeof(player_results) = 'array' THEN player_results ELSE '[]'::jsonb END
            ) as player
            WHERE player ->> 'id' = $1
        `, [id]);

        const rankRes = await query(`
            SELECT COUNT(*) + 1 as rank
            FROM students
            WHERE coins > (SELECT coins FROM students WHERE id = $1)
        `, [id]);

        const unlockRes = await query(`
            SELECT 1 FROM student_purchases 
            WHERE student_id = $1 AND item_id = 'avatar_unlock'
        `, [id]);

        res.json({
            coins: student.coins || 0,
            streakCount: student.streak_count || 0,
            isHero: student.is_hero || false,
            hasTrophy: student.has_trophy || false,
            weeklyBattleScore: student.weekly_battle_score || 0,
            groupId: student.group_id,
            avatarUrl: student.avatar_url || null,
            active_theme_id: student.active_theme_id,
            active_theme_color: student.active_theme_color,
            hasAvatarUnlock: (unlockRes.rowCount || 0) > 0,
            gamesPlayed: parseInt(gamesRes.rows[0].games_count) || 0,
            totalScore: parseInt(scoreRes.rows[0].total_score) || 0,
            rank: parseInt(rankRes.rows[0].rank) || 1
        });
    } catch (err) {
        console.error('Stats error:', err);
        res.status(500).json({ error: 'Error fetching stats' });
    }
};

export const getHistory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await query(`
            SELECT
                quiz_title,
                created_at,
                player ->> 'score' as score,
                total_questions,
                CASE WHEN total_questions > 0 THEN (player ->> 'score')::float * 100 / total_questions ELSE 0 END as percentage,
                player -> 'answers' as answers
            FROM game_results, jsonb_array_elements(
                CASE WHEN jsonb_typeof(player_results) = 'array' THEN player_results ELSE '[]'::jsonb END
            ) as player
            WHERE player ->> 'id' = $1
            ORDER BY created_at DESC
            LIMIT 50
        `, [id]);

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching history' });
    }
};

export const updateAvatar = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { avatar_url } = req.body;
        await query('UPDATE students SET avatar_url = $1 WHERE id = $2', [avatar_url, id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error updating avatar' });
    }
};

export const reportUsage = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { totalScreenTimeMs, topApps } = req.body;

        if (totalScreenTimeMs == null) return res.status(400).json({ error: 'Missing totalScreenTimeMs' });

        const studentRes = await query('SELECT name FROM students WHERE id = $1', [id]);
        if (studentRes.rowCount === 0) return res.status(404).json({ error: 'Student not found' });

        const formatTime = (ms: number) => {
            const minutes = Math.floor(ms / 60000) % 60;
            const hours = Math.floor(ms / 3600000);
            return `${hours} soat ${minutes} minut`;
        };

        const student = studentRes.rows[0];
        let report = `📱 <b>Farzandingiz (${student.name}) bugungi telefon ko'rsatkichi:</b>\n\n`;
        report += `⏱ <b>Jami Vaqt:</b> ${formatTime(totalScreenTimeMs)}\n\n`;

        if (topApps && Array.isArray(topApps) && topApps.length > 0) {
            report += `🔥 <b>Eng ko'p ishlatilgan dasturlar:</b>\n`;
            topApps.forEach((app, index) => {
                report += `${index + 1}. ${app.name} — ${formatTime(app.timeMs)}\n`;
            });
        }

        await notifyStudentSubscribers(id as string, report);
        res.json({ success: true, message: 'Usage stats relayed to Telegram' });
    } catch (err) {
        console.error('Usage stats relay error:', err);
        res.status(500).json({ error: 'Error processing usage stats' });
    }
};

export const setActiveTheme = async (req: Request, res: Response) => {
    try {
        const { studentId, themeId } = req.body;
        const purchaseRes = await query('SELECT 1 FROM student_purchases WHERE student_id = $1 AND item_id = $2 LIMIT 1', [studentId, themeId]);
        if (purchaseRes.rowCount === 0) return res.status(403).json({ error: 'Siz bu mavzuni sotib olmagansiz' });
        await query('UPDATE students SET active_theme_id = $1 WHERE id = $2', [themeId, studentId]);
        res.json({ success: true, themeId });
    } catch (err: any) {
        console.error('Set active theme error:', err);
        res.status(500).json({ error: 'Xatolik' });
    }
};

export const setActiveAvatar = async (req: Request, res: Response) => {
    try {
        const { studentId, itemId } = req.body;
        const itemRes = await query('SELECT url FROM shop_items WHERE id = $1 AND type = \'avatar\' AND is_active = TRUE', [itemId]);
        if (itemRes.rowCount === 0) return res.status(404).json({ error: 'Avatar topilmadi' });
        const avatarUrl = itemRes.rows[0].url;
        const purchaseRes = await query('SELECT 1 FROM student_purchases WHERE student_id = $1 AND item_id = $2 LIMIT 1', [studentId, itemId]);
        if (purchaseRes.rowCount === 0) return res.status(403).json({ error: 'Siz bu avatarni sotib olmagansiz' });
        await query('UPDATE students SET avatar_url = $1 WHERE id = $2', [avatarUrl, studentId]);
        res.json({ success: true, avatarUrl });
    } catch (err: any) {
        console.error('Set active avatar error:', err);
        res.status(500).json({ error: 'Xatolik' });
    }
};

export const getVocabBattleLevels = async (req: Request, res: Response) => {
    try {
        const studentId = req.query.studentId as string;
        if (!studentId) return res.status(400).json({ error: 'Student ID missing' });

        const settingsRes = await query('SELECT value FROM system_settings WHERE key = $1', ['vocab_battle_active']);
        const vocabBattleActive = (settingsRes.rowCount ?? 0) > 0 ? (settingsRes.rows[0].value === true || settingsRes.rows[0].value === 'true') : false;
        if (!vocabBattleActive) return res.json({ isActive: false });

        const studentRes = await query('SELECT g.level as daraja FROM students s JOIN groups g ON s.group_id = g.id WHERE s.id = $1', [studentId]);
        if (studentRes.rowCount === 0) return res.status(404).json({ error: 'Student or group not found' });
        const daraja = studentRes.rows[0].daraja;

        const result = await query('SELECT * FROM vocabulary_battles WHERE daraja = $1 ORDER BY level', [daraja]);
        const historyRes = await query(`
            SELECT quiz_title, player_results, total_questions 
            FROM game_results 
            WHERE quiz_title LIKE 'Vocab Battle: ' || $1 || ' - Level %'
        `, [daraja]);

        const levelScores: Record<number, number> = {};
        historyRes.rows.forEach(row => {
            const levelMatch = row.quiz_title.match(/Level (\d+)/);
            if (levelMatch) {
                const levelNum = parseInt(levelMatch[1]);
                let score = 0;
                const playerResults = row.player_results;
                if (Array.isArray(playerResults)) {
                    const studentResult = playerResults.find((p: any) => String(p.id) === String(studentId));
                    if (studentResult) score = studentResult.score;
                }
                const perc = row.total_questions > 0 ? (score / row.total_questions) * 100 : 0;
                if (!levelScores[levelNum] || perc > levelScores[levelNum]) levelScores[levelNum] = perc;
            }
        });

        let previousUnlockedComplete = true;
        const enrichedLevels = result.rows.map(battle => {
            const levelNum = battle.level;
            const perc = levelScores[levelNum] || 0;
            let stars = 0;
            if (perc >= 95) stars = 3;
            else if (perc >= 85) stars = 2;
            else if (perc >= 75) stars = 1;
            const isLocked = !previousUnlockedComplete && levelNum > 1;
            previousUnlockedComplete = perc >= 75;
            return { id: battle.id, daraja: battle.daraja, level: battle.level, title: battle.title, isLocked, stars, isActive: true };
        });
        res.json({ isActive: true, levels: enrichedLevels });
    } catch (err) {
        console.error('Error fetching vocab battle levels:', err);
        res.status(500).json({ error: 'Failed to fetch levels' });
    }
};

export const getVocabBattleById = async (req: Request, res: Response) => {
    try {
        const settingsRes = await query('SELECT value FROM system_settings WHERE key = $1', ['vocab_battle_active']);
        const vocabBattleActive = (settingsRes.rowCount ?? 0) > 0 ? (settingsRes.rows[0].value === true || settingsRes.rows[0].value === 'true') : false;
        if (!vocabBattleActive) return res.status(403).json({ error: 'Vocabulary Battle hozircha yopiq' });
        const result = await query('SELECT * FROM vocabulary_battles WHERE id = $1', [req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Topilmadi' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch battle' });
    }
};

export const bookExtraClass = async (req: Request, res: Response) => {
    try {
        const { studentId } = req.params;
        const { groupId, timeSlot, isForced, topic } = req.body;
        const existingRes = await query('SELECT 1 FROM extra_class_bookings WHERE student_id = $1', [studentId]);
        if (existingRes && existingRes.rowCount && existingRes.rowCount > 0) return res.status(400).json({ error: "Ushbu o'quvchida allaqachon bron mavjud!" });
        const countRes = await query(`SELECT COUNT(*) FROM extra_class_bookings WHERE group_id = $1 AND time_slot = $2 AND is_forced = $3`, [groupId, timeSlot, !!isForced]);
        const count = parseInt(countRes.rows[0].count);
        if (isForced ? count >= 5 : count >= 4) return res.status(400).json({ error: "Joy qolmagan!" });
        const id = uuidv4();
        await query('INSERT INTO extra_class_bookings (id, student_id, group_id, time_slot, topic, is_forced) VALUES ($1, $2, $3, $4, $5, $6)', [id, studentId, groupId, timeSlot, topic, !!isForced]);
        res.json({ success: true, id });
    } catch (err) {
        res.status(500).json({ error: 'Xatolik' });
    }
};

export const cancelBooking = async (req: Request, res: Response) => {
    try {
        await query('DELETE FROM extra_class_bookings WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Xatolik' });
    }
};

export const updateContactLog = async (req: Request, res: Response) => {
    try {
        const { relative } = req.body;
        const id = req.params.id;
        await query('UPDATE students SET last_contacted_relative = $1, last_contacted_at = NOW() WHERE id = $2', [relative, id]);
        await query('INSERT INTO contact_logs (id, student_id, relative, contacted_at) VALUES ($1, $2, $3, NOW())', [uuidv4(), id, relative]);
        res.json({ success: true, relative, contactedAt: new Date() });
    } catch (err) {
        res.status(500).json({ error: 'Error updating contact info' });
    }
};

export const getContactLogs = async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM contact_logs WHERE student_id = $1 ORDER BY contacted_at DESC', [req.params.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching contact logs' });
    }
};
