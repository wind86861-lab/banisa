import app from './app';
import { env } from './config/env';
import prisma from './config/database';
import { startCheckInScheduler } from './modules/appointments/check-in.scheduler';

const PORT = env.PORT || 5000;

async function bootstrap() {
    try {
        await prisma.$connect();
        console.log('Successfully connected to Database');

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT} in ${env.NODE_ENV} mode`);
            startCheckInScheduler();
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

bootstrap();
