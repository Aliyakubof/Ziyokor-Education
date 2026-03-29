import { query } from '../db';
import { notifyStudentSubscribers, sendBattleAlert } from '../bot';
import { notifySubscribers } from '../socket';

export async function awardRewards(studentId: string, score: number) {
    try {
        if (studentId.length !== 7) return;

        // Double XP Weekend logic (Saturday = 6, Sunday = 0)
        const now = new Date();
        const day = now.getDay();
        const isDoubleXP = (day === 0 || day === 6);
        const actualScore = isDoubleXP ? score * 2 : score;

        const coinsToAward = Math.floor(actualScore);
        const studentRes = await query('SELECT last_activity_at, streak_count, group_id FROM students WHERE id = $1', [studentId]);
        if (studentRes.rowCount === 0) return;
        const student = studentRes.rows[0];

        let newStreak = student.streak_count || 0;
        if (student.last_activity_at) {
            const lastDate = new Date(student.last_activity_at);
            const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
            if (diffDays === 1) {
                newStreak += 1;
                // Notify streak milestone
                if ([3, 7, 10, 15, 30, 50, 100].includes(newStreak)) {
                    await notifyStudentSubscribers(studentId, `🔥 <b>Dahshatli natija!</b>\nSiz <b>${newStreak} kun</b> ketma-ket dars qildingiz. To'xtab qolmang! 🚀`);
                }
            } else if (diffDays > 1) {
                newStreak = 1;
            }
        } else {
            newStreak = 1;
        }

        // Level Up Logic (Example: every 500 XP is high activity)
        if (actualScore >= 500) {
            await notifyStudentSubscribers(studentId, `🌟 <b>Barakalla!</b>\nSiz bugun juda faolsiz! +${actualScore} XP to'pladingiz. 💰`);
        }

        // Update Student
        await query(
            'UPDATE students SET coins = coins + $1, streak_count = $2, last_activity_at = $3, weekly_battle_score = weekly_battle_score + $4 WHERE id = $5',
            [coinsToAward, newStreak, now, actualScore, studentId]
        );

        // Notify Student via Socket
        notifySubscribers(`user_${studentId}`, 'stats_update', { 
            coins: (student.coins || 0) + coinsToAward, 
            streakCount: newStreak,
            weeklyBattleScore: (student.weekly_battle_score || 0) + actualScore
        });

        // Update Group Battle Score
        const battleRes = await query(`
            SELECT id, group_a_id, group_b_id 
            FROM group_battles 
            WHERE (group_a_id = $1 OR group_b_id = $1) AND status = 'active'
            ORDER BY created_at DESC LIMIT 1
        `, [student.group_id]);

        if (battleRes.rowCount && battleRes.rowCount > 0) {
            const battle = battleRes.rows[0];
            if (battle.group_a_id === student.group_id) {
                await query('UPDATE group_battles SET score_a = score_a + $1 WHERE id = $2', [actualScore, battle.id]);
            } else {
                await query('UPDATE group_battles SET score_b = score_b + $1 WHERE id = $2', [actualScore, battle.id]);
            }
            // Notify via Socket
            notifySubscribers(`role_teacher`, 'battle_update', {});
            notifySubscribers(`role_admin`, 'battle_update', {});
            notifySubscribers(`role_student`, 'battle_update', {});
        }

        console.log(`[Rewards] Awarded ${coinsToAward} coins to student ${studentId}. New streak: ${newStreak} (Double XP: ${isDoubleXP})`);
    } catch (err) {
        console.error('[Rewards] Error awarding rewards:', err);
    }
}

export async function bulkAwardRewards(players: { id: string, score: number }[]) {
    try {
        const validPlayers = players.filter(p => p.id && p.id.length === 7);
        if (validPlayers.length === 0) return;

        const now = new Date();
        const day = now.getDay();
        const isDoubleXP = (day === 0 || day === 6);

        const ids = validPlayers.map(p => p.id);
        const studentRes = await query('SELECT id, last_activity_at, streak_count, group_id FROM students WHERE id = ANY($1)', [ids]);
        const studentMap = new Map(studentRes.rows.map(r => [r.id, r]));

        const updates = [];
        const battleUpdates = new Map<string, number>();

        for (const p of validPlayers) {
            const student = studentMap.get(p.id);
            if (!student) continue;

            const actualScore = isDoubleXP ? p.score * 2 : p.score;
            const coinsToAward = Math.floor(actualScore);

            let newStreak = student.streak_count || 0;
            if (student.last_activity_at) {
                const lastDate = new Date(student.last_activity_at);
                const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
                if (diffDays === 1) {
                    newStreak += 1;
                    if ([3, 7, 10, 15, 30, 50, 100].includes(newStreak)) {
                        notifyStudentSubscribers(p.id, `🔥 <b>Dahshatli natija!</b>\nSiz <b>${newStreak} kun</b> ketma-ket dars qildingiz. To'xtab qolmang! 🚀`);
                    }
                } else if (diffDays > 1) {
                    newStreak = 1;
                }
            } else {
                newStreak = 1;
            }

            if (actualScore >= 500) {
                notifyStudentSubscribers(p.id, `🌟 <b>Barakalla!</b>\nSiz bugun juda faolsiz! +${actualScore} XP to'pladingiz. 💰`);
            }

            updates.push(query(
                'UPDATE students SET coins = coins + $1, streak_count = $2, last_activity_at = $3, weekly_battle_score = weekly_battle_score + $4 WHERE id = $5',
                [coinsToAward, newStreak, now, actualScore, p.id]
            ));

            // Socket Notification for each student
            notifySubscribers(`user_${p.id}`, 'stats_update', {
                coins: (student.coins || 0) + coinsToAward,
                streakCount: newStreak,
                weeklyBattleScore: (student.weekly_battle_score || 0) + actualScore
            });

            battleUpdates.set(student.group_id, (battleUpdates.get(student.group_id) || 0) + actualScore);
        }

        await Promise.all(updates);

        if (battleUpdates.size > 0) {
            const groupIds = Array.from(battleUpdates.keys());
            const battleRes = await query(`
                SELECT id, group_a_id, group_b_id 
                FROM group_battles 
                WHERE (group_a_id = ANY($1) OR group_b_id = ANY($1)) AND status = 'active'
            `, [groupIds]);

            for (const battle of battleRes.rows) {
                const scoreA = battleUpdates.get(battle.group_a_id) || 0;
                const scoreB = battleUpdates.get(battle.group_b_id) || 0;
                if (scoreA > 0) await query('UPDATE group_battles SET score_a = score_a + $1 WHERE id = $2', [scoreA, battle.id]);
                if (scoreB > 0) await query('UPDATE group_battles SET score_b = score_b + $1 WHERE id = $2', [scoreB, battle.id]);
                sendBattleAlert(battle.id).catch(() => { }); 
            }
            // Notify via Socket
            notifySubscribers(`role_teacher`, 'battle_update', {});
            notifySubscribers(`role_admin`, 'battle_update', {});
            notifySubscribers(`role_student`, 'battle_update', {});
        }
        console.log(`[Bulk Rewards] Successfully awarded ${validPlayers.length} players simultaneously.`);
    } catch (err) {
        console.error('[Bulk Rewards] Error:', err);
    }
}
