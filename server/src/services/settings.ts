import { query } from '../db';

/**
 * Service to manage system-wide configurations.
 * Values are stored as JSONB for flexibility.
 */
export class SettingsService {
    private static cache: Map<string, any> = new Map();
    private static lastFetch: number = 0;
    private static CACHE_TTL = 60000; // 1 minute

    /**
     * Get a setting by key. Returns the parsed value or a default.
     */
    static async get<T>(key: string, defaultValue: T): Promise<T> {
        const now = Date.now();
        // Refresh cache if expired
        if (now - this.lastFetch > this.CACHE_TTL) {
            await this.refreshCache();
        }

        if (this.cache.has(key)) {
            return this.cache.get(key) as T;
        }

        return defaultValue;
    }

    /**
     * Force refresh the settings cache from DB.
     */
    static async refreshCache() {
        try {
            const res = await query('SELECT key, value FROM system_settings');
            this.cache.clear();
            res.rows.forEach(row => {
                this.cache.set(row.key, row.value);
            });
            this.lastFetch = Date.now();
        } catch (err) {
            console.error('Error refreshing settings cache:', err);
        }
    }

    /**
     * Update a setting (and refresh cache).
     */
    static async set(key: string, value: any) {
        await query(
            'INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()',
            [key, JSON.stringify(value)]
        );
        this.cache.set(key, value);
    }
}
