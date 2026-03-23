
import { store } from './store';
import { query } from './db';
import { v4 as uuidv4 } from 'uuid';
import { bulkAwardRewards } from './services/rewardService';

async function forceEnd(pin: string) {
    console.log(`[ForceEnd] Starting for PIN: ${pin}`);
    const game = await store.getGame(pin);
    if (!game) {
        console.error('Game not found!');
        return;
    }

    console.log(`[ForceEnd] Found game: ${game.quiz.title}. Status: ${game.status}`);
    
    game.status = 'FINISHED';
    await store.setGame(pin, game);

    const leaderboard = [...game.players].sort((a, b) => b.score - a.score);
    console.log(`[ForceEnd] Leaderboard calculated. Top player: ${leaderboard[0]?.name} with ${leaderboard[0]?.score}`);

    if (game.isUnitQuiz && game.groupId) {
        try {
            let questions: any[] = [];
            try {
                if (Array.isArray(game.quiz.questions)) {
                    questions = game.quiz.questions;
                } else if (typeof game.quiz.questions === 'string') {
                    questions = JSON.parse(game.quiz.questions);
                }
            } catch (e) { questions = []; }

            let totalPossibleScore = 0;
            questions.forEach((q: any) => {
                if (q.type === 'info-slide') return;
                if (q.type === 'matching' || q.type === 'word-box') {
                    totalPossibleScore += q.acceptedAnswers?.length || 0;
                } else {
                    totalPossibleScore += 1;
                }
            });

            console.log(`[ForceEnd] Saving to game_results for group: ${game.groupId}`);
            await query(
                'INSERT INTO game_results (id, group_id, quiz_title, total_questions, player_results) VALUES ($1, $2, $3, $4, $5)',
                [uuidv4(), game.groupId, game.quiz.title, totalPossibleScore, JSON.stringify(game.players)]
            );
            console.log('[ForceEnd] Saved successfully.');

            // Award rewards
            await bulkAwardRewards(game.players);
            console.log('[ForceEnd] Rewards awarded.');

        } catch (err) {
            console.error('[ForceEnd] Error saving results:', err);
        }
    } else {
        console.log('[ForceEnd] Game is not a unit quiz or missing groupId. Only marked as finished.');
    }

    console.log('[ForceEnd] Done. Please restart PM2 now to clear all states.');
    process.exit(0);
}

const pin = process.argv[2] || '823841';
forceEnd(pin);
