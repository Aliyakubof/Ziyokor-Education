import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db';
import { generateSoloQuizPDF } from '../pdfGenerator';
import { sendSoloQuizPDF, notifyTeacher } from '../bot';
import { checkAnswer, countCorrectParts } from '../utils';
import { checkAnswersWithAIBatch } from '../aiChecker';
import { awardRewards } from '../services/rewardService';

// Helper to notify teacher about solo results (was in app.ts)
async function notifyTeacherOfSoloResult(studentId: string, quizTitle: string, score: number, maxScore: number) {
    try {
        const teacherRes = await query(`
            SELECT t.telegram_chat_id, s.name as student_name, g.name as group_name
            FROM students s
            JOIN groups g ON s.group_id = g.id
            JOIN teachers t ON g.teacher_id = t.id
            WHERE s.id = $1
        `, [studentId]);

        if (teacherRes.rows[0]?.telegram_chat_id) {
            const { telegram_chat_id, student_name, group_name } = teacherRes.rows[0];
            const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
            const status = percentage >= 70 ? "(O'tdi ✅)" : "(O'tmadi ❌)";
            await notifyTeacher(telegram_chat_id, `🎯 <b>Mashq tugatildi (Solo Mode):</b>\n\n👤 O'quvchi: ${student_name}\n🏫 Guruh: ${group_name}\n📝 Test: ${quizTitle}\n📊 Natija: ${score} / ${maxScore} (${percentage}%) ${status}`);
        }
    } catch (e) {
        console.error('Error notifying teacher of solo result:', e);
    }
}

// awardRewards logic is handled by RewardService

async function notifyTeacherOfVocabBattleResult(studentId: string, xp: number, coins: number) {
    try {
        const teacherRes = await query(`
            SELECT t.telegram_chat_id, s.name as student_name, g.name as group_name
            FROM students s
            JOIN groups g ON s.group_id = g.id
            JOIN teachers t ON g.teacher_id = t.id
            WHERE s.id = $1
        `, [studentId]);

        if (teacherRes.rows[0]?.telegram_chat_id) {
            const { telegram_chat_id, student_name, group_name } = teacherRes.rows[0];
            await notifyTeacher(telegram_chat_id, `⚔️ <b>Lug'at Battle tugatildi:</b>\n\n👤 O'quvchi: ${student_name}\n🏫 Guruh: ${group_name}\n📈 XP: ${xp}\n💰 Tangalar: ${coins}`);
        }
    } catch (e) {
        console.error('Error notifying teacher of vocab battle result:', e);
    }
}

export const createQuiz = async (req: Request, res: Response) => {
    try {
        const { title, questions } = req.body;
        const id = uuidv4();
        await query(
            'INSERT INTO quizzes (id, title, questions) VALUES ($1, $2, $3)',
            [id, title, JSON.stringify(questions)]
        );
        res.json({ id, title, questions });
    } catch (err) {
        res.status(500).json({ error: 'Error creating quiz' });
    }
};

export const getAllQuizzes = async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM quizzes');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching quizzes' });
    }
};

export const getQuizById = async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM quizzes WHERE id = $1', [req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Quiz not found' });
        res.json(result.rows[0]);
    } catch (err: any) {
        console.error('Error fetching quiz:', err);
        res.status(500).json({ error: 'Error fetching quiz', details: err.message });
    }
};

// Unit Quizzes
export const getUnitQuizzes = async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM unit_quizzes');
        res.json(result.rows);
    } catch (err: any) {
        console.error('Error fetching unit quizzes:', err);
        res.status(500).json({ error: 'Error fetching unit quizzes', details: err.message });
    }
};

export const getUnitQuizById = async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM unit_quizzes WHERE id = $1', [req.params.id]);
        if (result.rowCount === 0) return res.status(404).send('Unit Quiz not found');
        res.json(result.rows[0]);
    } catch (err: any) {
        console.error('Error fetching unit quiz:', err);
        res.status(500).json({ error: 'Error fetching unit quiz', details: err.message });
    }
};

export const getDuelQuizById = async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM duel_quizzes WHERE id = $1', [req.params.id]);
        if (result.rowCount === 0) return res.status(404).send('Duel Quiz not found');
        res.json(result.rows[0]);
    } catch (err: any) {
        console.error('Error fetching duel quiz:', err);
        res.status(500).json({ error: 'Error fetching duel quiz', details: err.message });
    }
};


export const createUnitQuiz = async (req: Request, res: Response) => {
    try {
        const { title, questions, level, unit, time_limit } = req.body;
        const id = uuidv4();
        await query(
            'INSERT INTO unit_quizzes (id, title, questions, level, unit, time_limit) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, title, Array.isArray(questions) ? JSON.stringify(questions) : questions, level, unit, time_limit || 30]
        );
        res.json({ id, title, questions: Array.isArray(questions) ? questions : JSON.parse(questions), level, unit, time_limit: time_limit || 30 });
    } catch (err) {
        console.error('Error creating unit quiz:', err);
        res.status(500).json({ error: 'Error creating unit quiz' });
    }
};

export const updateUnitQuiz = async (req: Request, res: Response) => {
    try {
        const { title, questions, level, unit, time_limit } = req.body;
        const { id } = req.params;
        await query(
            'UPDATE unit_quizzes SET title = $1, questions = $2, level = $3, unit = $4, time_limit = $5 WHERE id = $6',
            [title, Array.isArray(questions) ? JSON.stringify(questions) : questions, level, unit, time_limit || 30, id]
        );
        res.json({ id, title, questions: Array.isArray(questions) ? questions : JSON.parse(questions), level, unit, time_limit: time_limit || 30 });
    } catch (err) {
        console.error('Error updating unit quiz:', err);
        res.status(500).json({ error: 'Error updating unit quiz' });
    }
};

export const deleteUnitQuiz = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await query('DELETE FROM unit_quizzes WHERE id = $1', [id]);
        res.json({ success: true, id });
    } catch (err) {
        console.error('Error deleting unit quiz:', err);
        res.status(500).json({ error: 'Error deleting unit quiz' });
    }
};

// Vocabulary Battle Student Submission
export const submitVocabBattle = async (req: Request, res: Response) => {
    try {
        const { studentId, battleId, score, total } = req.body;
        if (!studentId || score === undefined || !total) {
            return res.status(400).json({ error: 'Invalid data' });
        }

        const battleRes = await query('SELECT * FROM vocabulary_battles WHERE id = $1', [battleId]);
        if (battleRes.rowCount === 0) return res.status(404).json({ error: 'Battle topilmadi' });
        const battle = battleRes.rows[0];

        const coinsEarned = score;
        await query('UPDATE students SET coins = coins + $1 WHERE id = $2', [coinsEarned, studentId]);

        const studentGroupIdRes = await query('SELECT group_id FROM students WHERE id = $1', [studentId]);
        if ((studentGroupIdRes.rowCount ?? 0) > 0) {
            const groupId = studentGroupIdRes.rows[0].group_id;
            const historyTitle = `Vocab Battle: ${battle.daraja} - Level ${battle.level}`;
            const playerResults = [{ id: studentId, name: 'Student', score, status: 'completed', answers: [] }];
            await query(
                'INSERT INTO game_results (id, group_id, quiz_title, total_questions, player_results) VALUES ($1, $2, $3, $4, $5)',
                [uuidv4(), groupId, historyTitle, total, JSON.stringify(playerResults)]
            );
        }

        await notifyTeacherOfVocabBattleResult(studentId, score * 10, coinsEarned);
        res.json({ success: true, coins: coinsEarned });
    } catch (err) {
        console.error('Error submitting vocab battle:', err);
        res.status(500).json({ error: 'Failed to submit battle' });
    }
};

// Solo Quiz Submission (Practice)
export const submitSoloQuizPDFReport = async (req: Request, res: Response) => {
    try {
        const { quizId, quizTitle, studentId, studentName, answers, score, maxScore, percentage, questions } = req.body;
        const pdfBuffer = await generateSoloQuizPDF(quizTitle, studentName, score, maxScore, percentage, questions, answers);
        const filename = `${studentName.replace(/\s+/g, '_')}_SoloQuiz_${new Date().getTime()}.pdf`;
        const caption = `📊 <b>Solo Quiz Natijasi</b>\n\n👤 O'quvchi: ${studentName}\n📝 Test: ${quizTitle}\n🏆 Natija: ${percentage}% (${score}/${maxScore} ball)`;
        await sendSoloQuizPDF(studentId, pdfBuffer, filename, caption);
        res.json({ success: true });
    } catch (err) {
        console.error('Submission processing error:', err);
        res.status(500).json({ error: 'Failed to process submission' });
    }
};

export const submitStudentQuiz = async (req: Request, res: Response) => {
    try {
        const { studentId, quizId, answers } = req.body;
        const quizRes = await query('SELECT * FROM unit_quizzes WHERE id = $1', [quizId]);
        if (quizRes.rowCount === 0) return res.status(404).json({ error: 'Quiz not found' });
        const quiz = quizRes.rows[0];
        const questions = quiz.questions;

        let immediateScore = 0;
        const results: any[] = [];
        const aiCheckPending: any[] = [];

        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            const studentAns = String(answers[i] || "");
            const textTypes = ['text-input', 'fill-blank', 'find-mistake', 'rewrite'];
            let isCorrect = false;
            let currentScore = 0;
            let isPending = false;

            if (q.type === 'info-slide') {
                results.push({ question: q.text, studentAnswer: "", isCorrect: true, score: 0, feedback: "Ma'lumot", pending: false });
                continue;
            }

            if (q.type === 'matching' || q.type === 'word-box') {
                const partsCorrect = countCorrectParts(studentAns, q.acceptedAnswers || []);
                currentScore = partsCorrect;
                immediateScore += currentScore;
            } else if (textTypes.includes(q.type)) {
                if (checkAnswer(studentAns, q.acceptedAnswers || [])) {
                    isCorrect = true;
                    currentScore = 1;
                    immediateScore += 1;
                } else if (studentAns) {
                    isPending = true;
                    aiCheckPending.push({ qIdx: i, text: q.text, studentAnswer: studentAns, type: q.type, acceptedAnswers: q.acceptedAnswers || [] });
                }
            } else {
                if (Number(studentAns) === q.correctIndex) {
                    isCorrect = true;
                    currentScore = 1;
                    immediateScore += 1;
                }
            }

            results.push({ question: q.text, studentAnswer: studentAns, isCorrect, score: currentScore, pending: isPending });
        }

        const studentRes = await query('SELECT group_id, name FROM students WHERE id = $1', [studentId]);
        const groupId = studentRes.rows[0]?.group_id;
        const studentName = studentRes.rows[0]?.name || 'Student';

        let maxScore = 0;
        questions.forEach((q: any) => {
            if (q.type === 'info-slide') return;
            maxScore += (q.type === 'matching' || q.type === 'word-box') ? (q.acceptedAnswers ? q.acceptedAnswers.length : 1) : 1;
        });

        const resultId = uuidv4();
        const playerResults = [{
            id: studentId,
            name: studentName,
            score: immediateScore,
            maxScore,
            answers,
            status: aiCheckPending.length > 0 ? 'pending' : 'completed',
            results // detailed results for each question
        }];

        if (groupId) {
            await query(
                'INSERT INTO game_results (id, group_id, quiz_title, total_questions, player_results) VALUES ($1, $2, $3, $4, $5)',
                [resultId, groupId, quiz.title, maxScore, JSON.stringify(playerResults)]
            );
        }

        await awardRewards(studentId, immediateScore);

        if (aiCheckPending.length > 0) {
            (async () => {
                try {
                    const aiResults = await checkAnswersWithAIBatch(aiCheckPending);
                    let aiScore = 0;
                    aiCheckPending.forEach((item, idx) => {
                        const air = aiResults[idx];
                        if (air?.isCorrect) {
                            aiScore += 1;
                        }
                        // Update the results array for the final save
                        const resIdx = results.findIndex(r => r.question === item.text && r.pending);
                        if (resIdx !== -1) {
                            results[resIdx].isCorrect = air?.isCorrect || false;
                            results[resIdx].score = air?.isCorrect ? 1 : 0;
                            results[resIdx].feedback = air?.feedback;
                            results[resIdx].pending = false;
                        }
                    });

                    if (aiScore > 0) await awardRewards(studentId, aiScore);
                    
                    // Update game_results if we have a groupId
                    if (groupId) {
                        playerResults[0].score = immediateScore + aiScore;
                        playerResults[0].status = 'completed';
                        playerResults[0].results = results;
                        await query(
                            'UPDATE game_results SET player_results = $1 WHERE id = $2',
                            [JSON.stringify(playerResults), resultId]
                        );
                    }

                    await notifyTeacherOfSoloResult(studentId, quiz.title, immediateScore + aiScore, maxScore);
                } catch (err) {
                    console.error('Background AI Check failed:', err);
                    await notifyTeacherOfSoloResult(studentId, quiz.title, immediateScore, maxScore);
                }
            })();
            res.json({ results, pending: true, immediateScore, maxScore, resultId });
        } else {
            await notifyTeacherOfSoloResult(studentId, quiz.title, immediateScore, maxScore);
            res.json({ results, pending: false, immediateScore, maxScore, resultId });
        }
    } catch (err) {
        console.error('Submission error:', err);
        res.status(500).json({ error: 'Server xatosi' });
    }
};

// Solo Quizzes (Practice sets)
export const getSoloQuizzes = async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM solo_quizzes ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err: any) {
        console.error('Error fetching solo quizzes:', err);
        res.status(500).json({ error: 'Error fetching solo quizzes', details: err.message });
    }
};

export const getSoloQuizById = async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM solo_quizzes WHERE id = $1', [req.params.id]);
        if (result.rowCount === 0) return res.status(404).send('Solo Quiz not found');
        res.json(result.rows[0]);
    } catch (err: any) {
        console.error('Error fetching solo quiz:', err);
        res.status(500).json({ error: 'Error fetching solo quiz', details: err.message });
    }
};

export const createSoloQuiz = async (req: Request, res: Response) => {
    try {
        const { title, questions, level, unit, time_limit } = req.body;
        const id = uuidv4();
        await query('INSERT INTO solo_quizzes (id, title, questions, level, unit, time_limit) VALUES ($1, $2, $3, $4, $5, $6)', [id, title, JSON.stringify(questions), level || 'Beginner', unit || '', time_limit || 30]);
        res.json({ id, title, questions, level, unit, time_limit });
    } catch (err) {
        res.status(500).json({ error: 'Error creating solo quiz' });
    }
};

export const updateSoloQuiz = async (req: Request, res: Response) => {
    try {
        const { title, questions, level, unit, time_limit } = req.body;
        const { id } = req.params;
        await query('UPDATE solo_quizzes SET title = $1, questions = $2, level = $3, unit = $4, time_limit = $5 WHERE id = $6', [title, JSON.stringify(questions), level || 'Beginner', unit || '', time_limit || 30, id]);
        res.json({ id, title, questions, level, unit, time_limit });
    } catch (err) {
        res.status(500).json({ error: 'Error updating solo quiz' });
    }
};

export const deleteSoloQuiz = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await query('DELETE FROM solo_quizzes WHERE id = $1', [id]);
        res.json({ success: true, id });
    } catch (err) {
        res.status(500).json({ error: 'Error deleting solo quiz' });
    }
};

// Duel Quizzes
export const getDuelQuizzes = async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM duel_quizzes ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err: any) {
        console.error('Error fetching duel quizzes:', err);
        res.status(500).json({ error: 'Error fetching duel quizzes', details: err.message });
    }
};

export const createDuelQuiz = async (req: Request, res: Response) => {
    try {
        const { title, questions, level, daraja, is_active } = req.body;
        const id = uuidv4();
        await query('INSERT INTO duel_quizzes (id, title, questions, daraja, is_active) VALUES ($1, $2, $3, $4, $5)', [id, title, JSON.stringify(questions), daraja || level || 'Beginner', is_active !== undefined ? is_active : true]);
        res.json({ id, title, questions, daraja: daraja || level || 'Beginner', is_active });
    } catch (err) {
        res.status(500).json({ error: 'Error creating duel quiz' });
    }
};

export const updateDuelQuiz = async (req: Request, res: Response) => {
    try {
        const { title, questions, level, daraja, is_active } = req.body;
        await query('UPDATE duel_quizzes SET title = $1, questions = $2, daraja = $3, is_active = $4 WHERE id = $5', [title, JSON.stringify(questions), daraja || level || 'Beginner', is_active, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error updating duel quiz' });
    }
};

export const deleteDuelQuiz = async (req: Request, res: Response) => {
    try {
        await query('DELETE FROM duel_quizzes WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error deleting duel quiz' });
    }
};
export const getCurrentBattleByGroup = async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM group_battles WHERE (group_a_id = $1 OR group_b_id = $1) AND status = \'active\' ORDER BY created_at DESC LIMIT 1', [req.params.groupId]);
        res.json(result.rows[0] || null);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching battle' });
    }
};

export const getAvailableDuelQuizzes = async (req: Request, res: Response) => {
    try {
        const studentRes = await query('SELECT g.level FROM students s JOIN groups g ON s.group_id = g.id WHERE s.id = $1', [req.params.studentId]);
        const level = studentRes.rows[0]?.level || 'Beginner';
        const result = await query('SELECT id, title, daraja FROM duel_quizzes WHERE LOWER(TRIM(daraja)) = LOWER(TRIM($1)) AND (is_active = TRUE OR is_active IS NULL) ORDER BY created_at DESC', [level]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch available duel quizzes' });
    }
};

