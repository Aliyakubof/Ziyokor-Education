/**
 * Simple structured logger for Telegram games and server events.
 * Can be expanded to send logs to external services (e.g. Winston, Sentry).
 */
export class Logger {
    private context: string;

    constructor(context: string) {
        this.context = context;
    }

    info(message: string, meta?: any) {
        console.log(`[${new Date().toISOString()}] [INFO] [${this.context}] ${message}`, meta ? JSON.stringify(meta) : '');
    }

    error(message: string, error?: any) {
        console.error(`[${new Date().toISOString()}] [ERROR] [${this.context}] ${message}`, error || '');
    }

    warn(message: string, meta?: any) {
        console.warn(`[${new Date().toISOString()}] [WARN] [${this.context}] ${message}`, meta ? JSON.stringify(meta) : '');
    }
}

export const gameLogger = new Logger('TelegramGame');
