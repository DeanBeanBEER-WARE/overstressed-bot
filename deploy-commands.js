import { REST, Routes } from 'discord.js';
import { config } from './src/config/config.js';
import { rankCommand } from './src/commands/rank.js';
import { linkCommand } from './src/commands/link.js';
import { unlinkCommand } from './src/commands/unlink.js';
import { whitelistCommand } from './src/commands/whitelist.js';
import { resyncCommand } from './src/commands/resync.js';
import { onlineCommand } from './src/commands/online.js';
import { tpsCommand } from './src/commands/tps.js';
import { statsCommand } from './src/commands/stats.js';
import { kickCommand } from './src/commands/kick.js';
import { broadcastCommand } from './src/commands/broadcast.js';
import { uptimeCommand } from './src/commands/uptime.js';
import { topCommand } from './src/commands/top.js';
import { stopCommand } from './src/commands/stop.js';
import { restartCommand } from './src/commands/restart.js';
import { consoleCommand } from './src/commands/console.js';
import { maintenanceCommand } from './src/commands/maintenance.js';
import { purgeCommand } from './src/commands/purge.js';
import { muteCommand } from './src/commands/mute.js';
import { unmuteCommand } from './src/commands/unmute.js';
import { command as syncAllRanksCommand } from './src/commands/sync_all_ranks.js';

/** @type {Array} Array of all slash command data */
const commands = [
  rankCommand.data.toJSON(),
  linkCommand.data.toJSON(),
  unlinkCommand.data.toJSON(),
  whitelistCommand.data.toJSON(),
  resyncCommand.data.toJSON(),
  onlineCommand.data.toJSON(),
  tpsCommand.data.toJSON(),
  statsCommand.data.toJSON(),
  kickCommand.data.toJSON(),
  broadcastCommand.data.toJSON(),
  uptimeCommand.data.toJSON(),
  topCommand.data.toJSON(),
  stopCommand.data.toJSON(),
  restartCommand.data.toJSON(),
  consoleCommand.data.toJSON(),
  maintenanceCommand.data.toJSON(),
  purgeCommand.data.toJSON(),
  muteCommand.data.toJSON(),
  unmuteCommand.data.toJSON(),
  syncAllRanksCommand.data.toJSON(),
];

/** @type {REST} Discord REST client instance */
const rest = new REST().setToken(config.discord.token);

/**
 * Deploys slash commands to the configured guild.
 * @async
 * @returns {Promise<void>}
 */
(async () => {
  try {
    console.log(`[Deploy] Started refreshing ${commands.length} application (/) commands.`);

    const data = await rest.put(
      Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
      { body: commands }
    );

    console.log(`[Deploy] Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    console.error('[Deploy] Error deploying commands:', error);
  }
})();
