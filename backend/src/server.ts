import app from './app';
import { env } from './config/env';
import prisma from './config/database';
import { startCheckInScheduler } from './modules/appointments/check-in.scheduler';
import { startReminderScheduler } from './modules/appointments/reminder.scheduler';
import { startDailySummaryScheduler } from './modules/appointments/daily-summary.scheduler';
// Payment-expiry scheduler removed: the new flow lets the patient pay any
// time before check-in, and after check-in the cashier reminder + the
// PAID-before-IN_PROGRESS gate handle non-payers. Auto-cancelling an
// unpaid booking after 24h was wrong — patients book days in advance.
import { getBot, isTelegramConfigured, setupChatMenuButton, setupBotCommands } from './modules/telegram/telegram.bot';

const PORT = env.PORT || 5000;

async function bootstrap() {
    try {
        await prisma.$connect();
        console.log('Successfully connected to Database');

        const server = app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT} in ${env.NODE_ENV} mode`);
            // Only run background jobs on the first PM2 instance — otherwise
            // every replica double-fires NO_SHOW sweeps and cash re-notifies.
            const instanceId = process.env.NODE_APP_INSTANCE ?? process.env.pm_id ?? '0';
            if (instanceId === '0') {
                startCheckInScheduler();
                startReminderScheduler();
                startDailySummaryScheduler();
                setupTelegramWebhook().catch((e) => console.error('[telegram] webhook setup failed:', e));
            } else {
                console.log(`[scheduler] skipped on instance ${instanceId}`);
            }
        });

        const shutdown = (signal: string) => {
            console.log(`[shutdown] received ${signal} — draining...`);
            server.close(async () => {
                try {
                    await prisma.$disconnect();
                } catch (e) {
                    console.error('[shutdown] prisma disconnect failed', e);
                }
                process.exit(0);
            });
            // Hard exit if graceful drain hangs (e.g. long-lived connections).
            setTimeout(() => process.exit(1), 10_000).unref();
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

async function setupTelegramWebhook() {
    if (!isTelegramConfigured()) {
        console.log('[telegram] TELEGRAM_BOT_TOKEN not set — skipping webhook setup');
        return;
    }
    const bot = getBot();
    if (!bot) return;
    const publicBase = process.env.PUBLIC_API_BASE_URL || '';
    if (!publicBase || publicBase.includes('localhost')) {
        console.log('[telegram] PUBLIC_API_BASE_URL missing or local — skipping webhook registration');
        return;
    }
    const url = publicBase.replace(/\/+$/, '') + '/api/telegram/webhook';
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET || undefined;
    const desiredUpdates = ['message', 'callback_query'];
    try {
        const info = await bot.api.getWebhookInfo();
        const currentUpdates = info.allowed_updates || [];
        const updatesMatch = desiredUpdates.length === currentUpdates.length
            && desiredUpdates.every(u => currentUpdates.includes(u as any));
        if (info.url === url && updatesMatch) {
            console.log('[telegram] webhook already up to date:', url);
        } else {
            await bot.api.setWebhook(url, { secret_token: secret, allowed_updates: desiredUpdates as any });
            console.log('[telegram] webhook registered:', url, 'updates:', desiredUpdates);
        }
    } catch (e) {
        console.error('[telegram] setWebhook failed:', e);
    }

    // Persistent chat menu button (next to text input) + command popup list.
    // Runs on every boot — idempotent on Telegram's side.
    await setupChatMenuButton();
    await setupBotCommands();
}

bootstrap();
