import { createClient } from './src/bot/client.js';
import { config } from './src/config/config.js';
import { scannerService } from './src/services/scannerService.js';
import { statusService } from './src/services/statusService.js';

/**
 * Initializes and starts the Discord bot application.
 * Establishes the connection to Discord and initializes background services
 * such as the rank scanner and status updater.
 * 
 * @async
 * @function bootstrap
 * @returns {Promise<void>} Resolves when the bot is successfully started.
 */
async function bootstrap() {
  try {
    const client = await createClient();
    await client.login(config.discord.token);

    scannerService.start(client);
    statusService.start(client);
  } catch (error) {
    console.error('[Main] Failed to start the bot:', error);
    process.exit(1);
  }
}

bootstrap();

/**
 * Global unhandled promise rejection listener.
 * Prevents silent crashes by logging the rejection details.
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Main] Unhandled Rejection at:', promise, 'reason:', reason);
});

/**
 * Global uncaught exception listener.
 * Prevents silent crashes by logging the exception details.
 */
process.on('uncaughtException', (error) => {
  console.error('[Main] Uncaught Exception:', error);
});
