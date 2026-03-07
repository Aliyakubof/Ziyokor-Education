import cron from 'node-cron';
import { query } from './db';
import path from 'path';
import fs from 'fs';

const CLEANUP_INTERVAL = "90 days";

// Helper function to safely run delete queries and log the outcome
async function runCleanup(tableName: string, dateColumn: string, condition?: string) {
    try {
        let sql = `DELETE FROM ${tableName} WHERE ${dateColumn} < NOW() - INTERVAL '${CLEANUP_INTERVAL}'`;
        if (condition) {
            sql += ` AND ${condition}`;
        }

        const result = await query(sql);
        if (result.rowCount && result.rowCount > 0) {
            console.log(`[Auto-Cleanup] Gid_ID: Deleted ${result.rowCount} old records from ${tableName}.`);
        }
    } catch (err) {
        console.error(`[Auto-Cleanup Error] Failed to clean ${tableName}:`, err);
    }
}

export function startCronJobs() {
    // Schedule the task to run every day at 03:00 AM server time
    // cron syntax: minute hour dayOfMonth month dayOfWeek
    cron.schedule('0 3 * * *', async () => {
        console.log('[Auto-Cleanup] Starting scheduled database cleanup job...');

        // 1. Clean old game_results (Heavy JSON payloads)
        await runCleanup('game_results', 'created_at');

        // 2. Clean old completed duels (Not needed after months)
        // Keep pending/active ones in case they somehow got stuck without a close timestamp
        // or just rely on created_at for everything. It's safe to clear any duel older than 90 days.
        await runCleanup('duels', 'created_at');

        // 3. Clean old contact logs (Call history to parents)
        await runCleanup('contact_logs', 'contacted_at');

        // 4. Clean old PDF result files (Server storage)
        const resultsDir = path.join(__dirname, '..', 'storage', 'results');
        if (fs.existsSync(resultsDir)) {
            const files = fs.readdirSync(resultsDir);
            const now = Date.now();
            const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

            files.forEach((file: string) => {
                const filePath = path.join(resultsDir, file);
                try {
                    const stats = fs.statSync(filePath);
                    if (now - stats.mtimeMs > sevenDaysMs) {
                        fs.unlinkSync(filePath);
                        console.log(`[Auto-Cleanup] Deleted old PDF: ${file}`);
                    }
                } catch (err) {
                    console.error(`[Auto-Cleanup Error] Failed to delete ${file}:`, err);
                }
            });
        }
    });

    // Weekly Group Leaderboard: Every Sunday at 20:00
    cron.schedule('0 20 * * 0', async () => {
        console.log('[Cron] Sending weekly group leaderboards...');
        // Lazy import to avoid circular dependency at startup
        const { bot } = await import('./bot');
        const { sendGroupWeeklyLeaderboard } = await import('./telegram_game');
        await sendGroupWeeklyLeaderboard(bot);
    }, {
        timezone: "Asia/Tashkent"
    });

    console.log('[Auto-Cleanup] Cron jobs initialized successfully.');
}
