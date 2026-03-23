
import { query } from './db';
import { createClient } from 'redis';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisClient = createClient({ url: redisUrl });

async function forceEnd(pin: string) {
    console.log(`[ForceEnd] Starting for PIN: ${pin}`);
    
    try {
        await redisClient.connect();
        console.log(`[ForceEnd] Connected to Redis at ${redisUrl}`);
        
        const key = `game:${pin}`;
        const data = await redisClient.hGetAll(key);
        
        if (!data || !data.metadata) {
            console.error('Game not found in Redis!');
            process.exit(1);
        }

        const game = JSON.parse(data.metadata);
        game.players = [];
        for (const [field, value] of Object.entries(data)) {
            if (field.startsWith('player:')) {
                game.players.push(JSON.parse(value));
            }
        }

        console.log(`[ForceEnd] Found game: ${game.quiz?.title || 'Unknown'}. Players: ${game.players.length}`);
        
        // Mark as finished in Redis
        game.status = 'FINISHED';
        await redisClient.hSet(key, 'metadata', JSON.stringify(game));
        console.log('[ForceEnd] Marked as FINISHED in Redis.');

        if (game.isUnitQuiz && game.groupId) {
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

            console.log(`[ForceEnd] Saving to PostgreSQL game_results for group: ${game.groupId}`);
            await query(
                'INSERT INTO game_results (id, group_id, quiz_title, total_questions, player_results) VALUES ($1, $2, $3, $4, $5)',
                [uuidv4(), game.groupId, game.quiz.title, totalPossibleScore, JSON.stringify(game.players)]
            );
            console.log('[ForceEnd] Results saved to DB.');

            // Note: bulkAwardRewards is skipped here to keep script simple, 
            // but we can add it if needed. For now, saving results is priority.
        }

        console.log('[ForceEnd] Success. You can now restart PM2.');
        process.exit(0);
    } catch (err) {
        console.error('[ForceEnd] Error:', err);
        process.exit(1);
    }
}

const pin = process.argv[2] || '823841';
forceEnd(pin);
