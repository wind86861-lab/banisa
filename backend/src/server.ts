import app from './app';
import { env } from './config/env';
import prisma from './config/database';
import { startCheckInScheduler } from './modules/appointments/check-in.scheduler';

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

bootstrap();
