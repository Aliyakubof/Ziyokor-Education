import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db';
import { generateToken } from '../middleware/auth';
import { notifyStudentSubscribers } from '../bot';
import { notifySubscribers } from '../socket';

export const getLeaderboard = async (req: Request, res: Response) => {
    try {
        const { type = 'coins', limit = 50, view = 'global', groupId } = req.query;
        let queryStr = '';
        const params: any[] = [];

        // Efficient real-time leaderboard using denormalized columns and indices
        queryStr = `
            SELECT 
                s.id, s.name, s.coins, s.streak_count, s.avatar_url, 
                s.total_vocab_score as vocab_score,
                g.name as group_name, g.level as group_level, 
                CASE 
                    WHEN $1 = 'streaks' THEN s.streak_count 
                    WHEN $1 = 'vocab' THEN s.total_vocab_score 
                    ELSE s.coins 
                END as stats_value
            FROM students s
            LEFT JOIN groups g ON s.group_id = g.id
        `;
        params.push(type);

        const conditions: string[] = [];
        if (view === 'group' && groupId && groupId !== 'undefined' && groupId !== 'null') {
            conditions.push(`s.group_id = $${params.length + 1}`);
            params.push(groupId);
        } else if (view === 'global' && groupId && groupId !== 'undefined' && groupId !== 'null') {
            conditions.push(`g.level = (SELECT level FROM groups WHERE id = $${params.length + 1})`);
            params.push(groupId);
        }

        if (conditions.length > 0) {
            queryStr += ` WHERE ` + conditions.join(' AND ');
        }

        if (type === 'streaks') {
            queryStr += ` ORDER BY s.streak_count DESC, s.coins DESC`;
        } else if (type === 'vocab') {
            queryStr += ` ORDER BY s.total_vocab_score DESC, s.coins DESC`;
        } else {
            queryStr += ` ORDER BY s.coins DESC, s.streak_count DESC`;
        }

        queryStr += ` LIMIT $${params.length + 1}`;
        params.push(parseInt(limit as string) || 50);

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

        // Consolidated query for all student stats to reduce DB round-trips
        const result = await query(`
            SELECT
                s.coins,
                s.streak_count,
                s.active_theme_id,
                s.avatar_url,
                COALESCE(s.is_hero, false) as is_hero,
                COALESCE(s.weekly_battle_score, 0) as weekly_battle_score,
                s.group_id,
                COALESCE(g.has_trophy, false) as has_trophy,
                si.color as active_theme_color,
                (SELECT COUNT(*) FROM game_results gr, jsonb_array_elements(CASE WHEN jsonb_typeof(gr.player_results) = 'array' THEN gr.player_results ELSE '[]'::jsonb END) as player WHERE player ->> 'id' = s.id) as games_count,
                (SELECT SUM((player ->> 'score')::int) FROM game_results gr, jsonb_array_elements(CASE WHEN jsonb_typeof(gr.player_results) = 'array' THEN gr.player_results ELSE '[]'::jsonb END) as player WHERE player ->> 'id' = s.id) as total_score,
                (SELECT COUNT(*) + 1 FROM students WHERE coins > s.coins) as rank,
                (SELECT 1 FROM student_purchases sp WHERE sp.student_id = s.id AND sp.item_id = 'avatar_unlock' LIMIT 1) as has_avatar_unlock
            FROM students s 
            LEFT JOIN groups g ON s.group_id = g.id 
            LEFT JOIN shop_items si ON s.active_theme_id = si.id
            WHERE s.id = $1
        `, [id]);
        
        if (result.rowCount === 0) return res.json(null);
        const student = result.rows[0];

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
            hasAvatarUnlock: !!student.has_avatar_unlock,
            gamesPlayed: parseInt(student.games_count) || 0,
            totalScore: parseInt(student.total_score) || 0,
            vocabScore: 0, // Fallback to 0 if column is being added
            rank: parseInt(student.rank) || 1
        });
    } catch (err: any) {
        console.error('Stats error for ID:', req.params.id, err);
        res.status(500).json({ 
            error: 'Error fetching stats', 
            details: err.message
        });
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
        notifySubscribers(`user_${id}`, 'stats_update', { avatarUrl: avatar_url });
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
        notifySubscribers(`user_${studentId}`, 'stats_update', { active_theme_id: themeId });
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
        notifySubscribers(`user_${studentId}`, 'stats_update', { avatarUrl });
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
        if (studentRes.rowCount === 0) return res.json({ isActive: false, levels: [] });
        const daraja = studentRes.rows[0].daraja;

        const result = await query('SELECT * FROM vocabulary_battles WHERE daraja = $1 ORDER BY level', [daraja]);
        const historyRes = await query(`
            SELECT quiz_title, player_results, total_questions 
            FROM game_results 
            WHERE quiz_title LIKE 'Vocab Battle: ' || $1 || ' - Level %'
        `, [daraja]);

        const levelScores: Record<number, number> = {};
        const levelPasses: Record<number, boolean> = {};

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
                const mistakes = row.total_questions > 0 ? (row.total_questions - score) : 0;
                const perc = row.total_questions > 0 ? (score / row.total_questions) * 100 : 0;
                
                if (!levelScores[levelNum] || perc > levelScores[levelNum]) {
                    levelScores[levelNum] = perc;
                }
                
                if (mistakes <= 1 && row.total_questions > 0) {
                    levelPasses[levelNum] = true;
                }
            }
        });

        let previousUnlockedComplete = true;
        const enrichedLevels = result.rows.map(battle => {
            const levelNum = battle.level;
            const perc = levelScores[levelNum] || 0;
            const passed = levelPasses[levelNum] || false;
            
            let stars = 0;
            if (passed) {
                if (perc >= 100) stars = 3;
                else stars = 2; // 1 mistake allowed passing gives 2 stars
            }
            
            const isLocked = !previousUnlockedComplete && levelNum > 1;
            previousUnlockedComplete = passed;
            
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
        if (result.rowCount === 0) return res.json(null);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch battle' });
    }
};

export const bookExtraClass = async (req: Request, res: Response) => {
    try {
        const { studentId } = req.params;
        const { groupId, timeSlot, isForced, topic, bookingDate } = req.body;

        // Tashkent Timezone normalization (+5:00)
        const now = new Date();
        const tashkentTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (5 * 60 * 60 * 1000));
        const todayStr = tashkentTime.toISOString().split('T')[0];
        const currentHours = tashkentTime.getHours();
        const currentMinutesValue = tashkentTime.getMinutes();
        const totalMinutes = currentHours * 60 + currentMinutesValue;
        const cutoffMinutes = 17 * 60 + 30; // 17:30

        // Fetch group settings for allowed days
        const groupRes = await query('SELECT extra_class_days FROM groups WHERE id = $1', [groupId]);
        const allowedDays = groupRes.rows[0]?.extra_class_days || [];

        if (!allowedDays || allowedDays.length === 0) {
            return res.status(400).json({ error: "Hali qo'shimcha dars kunlari belgilanmagan!" });
        }

        // Calculate absolute nearest valid date
        const dayMap: Record<string, number> = {
            'Yakshanba': 0, 'Dushanba': 1, 'Seshanba': 2, 'Chorshanba': 3, 'Payshanba': 4, 'Juma': 5, 'Shanba': 6
        };

        let nearestDate: string | null = null;
        let minDiff = 8;
        
        allowedDays.forEach((dayName: string) => {
            const dayIdx = dayMap[dayName];
            if (dayIdx === undefined) return;
            
            let diff = (dayIdx - tashkentTime.getDay() + 7) % 7;
            
            // If today is an allowed day but it's past cutoff, the "nearest" occurrence of this day is next week
            if (diff === 0 && totalMinutes >= cutoffMinutes) {
                diff = 7;
            }
            
            if (diff < minDiff) {
                minDiff = diff;
                const d = new Date(tashkentTime);
                d.setDate(tashkentTime.getDate() + diff);
                nearestDate = d.toISOString().split('T')[0];
            }
        });

        if (bookingDate !== nearestDate) {
            return res.status(400).json({ error: `Faqat eng yaqin dars kuni (${nearestDate}) uchun bron qilish mumkin!` });
        }

        // 1. Broad Clean up stale/completed bookings (past date, NULL date, or is_completed)
        // This ensures the booking data is "daily updated" in the Tashkent context
        await query(
            `DELETE FROM extra_class_bookings WHERE (booking_date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tashkent')::date) OR (booking_date IS NULL) OR (is_completed = TRUE)`
        );

        if (bookingDate === todayStr && totalMinutes >= cutoffMinutes) {
            return res.status(400).json({ error: "Bugun uchun bron qilish vaqti (17:30) tugadi!" });
        }

        // Check if this specific student already has a booking for this date
        const existingRes = await query(
            `SELECT id FROM extra_class_bookings WHERE student_id = $1 AND booking_date = $2`,
            [studentId, bookingDate]
        );
        if (existingRes.rowCount && existingRes.rowCount > 0) {
            return res.status(400).json({ error: "Siz bu kunga allaqachon bron qilgansiz!" });
        }

        // Check slot capacity for this specific date + time
        const countRes = await query(
            `SELECT COUNT(*) FROM extra_class_bookings WHERE group_id = $1 AND time_slot = $2 AND is_forced = $3 AND (booking_date = $4 OR booking_date IS NULL)`,
            [groupId, timeSlot, !!isForced, bookingDate || null]
        );
        const count = parseInt(countRes.rows[0].count);
        if (isForced ? count >= 5 : count >= 4) {
            return res.status(400).json({ error: "Bu vaqt uchun joy qolmagan!" });
        }

        const id = uuidv4();
        await query(
            'INSERT INTO extra_class_bookings (id, student_id, group_id, time_slot, topic, is_forced, booking_date) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [id, studentId, groupId, timeSlot, topic, !!isForced, bookingDate || null]
        );
        notifySubscribers(`role_teacher`, 'booking_update', {});
        notifySubscribers(`role_admin`, 'booking_update', {});
        notifySubscribers(`user_${studentId}`, 'booking_update', {});
        res.json({ success: true, id });
    } catch (err) {
        console.error('bookExtraClass error:', err);
        res.status(500).json({ error: 'Xatolik' });
    }
};

export const cancelBooking = async (req: Request, res: Response) => {
    try {
        await query('DELETE FROM extra_class_bookings WHERE id = $1', [req.params.id]);
        notifySubscribers(`role_teacher`, 'booking_update', {});
        notifySubscribers(`role_admin`, 'booking_update', {});
        notifySubscribers(`role_student`, 'booking_update', {});
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
