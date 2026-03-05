import { createClient } from './bot/client.js';
import { config } from './config/config.js';
import { scannerService } from './services/scannerService.js';
import { statusService } from './services/statusService.js';

/**
 * Main entry point for the Discord bot.
 */
async function bootstrap() {
  try {
    const client = await createClient();
    await client.login(config.discord.token);

    // Start the automatic rank scanning system
    scannerService.start(client);

    // Start the status update service
    statusService.start(client);
  } catch (error) {
    console.error('[Main] Failed to start the bot:', error);
    process.exit(1);
  }
}

bootstrap();

// Global error handlers to prevent silent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Main] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[Main] Uncaught Exception:', error);
  // Optional: Graceful shutdown logic here if needed
});
