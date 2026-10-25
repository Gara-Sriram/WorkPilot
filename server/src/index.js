import app from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { recoverInterruptedTasks } from './services/taskService.js';
import { seedDemoData } from './services/demoSeeder.js';

async function bootstrap() {
  try {
    console.log('----------------------------------------------------');
    console.log('  WorkPilot — Autonomous AI Employee Server');
    console.log('  Tagline: From instructions to verified outcomes');
    console.log('----------------------------------------------------');

    // 1. Connect Database
    await connectDB();

    // 2. Recover interrupted tasks from previous sessions
    await recoverInterruptedTasks();

    // 3. Seed demo documents if not present
    try {
      await seedDemoData({ reset: false });
    } catch (seedErr) {
      console.warn(`[Bootstrap] Notice on demo seeding: ${seedErr.message}`);
    }

    // 4. Start HTTP Server
    const server = app.listen(env.PORT, '0.0.0.0', () => {
      console.log(`[WorkPilot Server] Running at: http://localhost:${env.PORT}`);
      console.log(`[AI Mode] ${env.isLiveAI ? `Live Gemini (${env.GEMINI_MODEL})` : 'Deterministic Demo Fixture Mode'}`);
      console.log(`[CORS Origin] Allowed: ${env.CLIENT_ORIGIN}`);
      console.log(`[Health Endpoint] http://localhost:${env.PORT}/api/health`);
      console.log('----------------------------------------------------');
    });

    // Graceful Shutdown
    const handleShutdown = async (signal) => {
      console.log(`\n[Shutdown] Received ${signal}. Closing HTTP server and database...`);
      server.close(async () => {
        await disconnectDB();
        console.log('[Shutdown] Clean exit.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  } catch (err) {
    console.error('[Bootstrap Fatal Error]:', err);
    process.exit(1);
  }
}

bootstrap();
