import { REST, Routes } from 'discord.js';
import { config } from './config/config.js';
import { rankCommand } from './commands/rank.js';
import { linkCommand } from './commands/link.js';
import { unlinkCommand } from './commands/unlink.js';
import { whitelistCommand } from './commands/whitelist.js';
import { resyncCommand } from './commands/resync.js';
import { onlineCommand } from './commands/online.js';
import { tpsCommand } from './commands/tps.js';
import { statsCommand } from './commands/stats.js';
import { kickCommand } from './commands/kick.js';
import { broadcastCommand } from './commands/broadcast.js';
import { uptimeCommand } from './commands/uptime.js';
import { topCommand } from './commands/top.js';
import { stopCommand } from './commands/stop.js';
import { restartCommand } from './commands/restart.js';
import { consoleCommand } from './commands/console.js';
import { maintenanceCommand } from './commands/maintenance.js';
import { purgeCommand } from './commands/purge.js';
import { muteCommand } from './commands/mute.js';
import { unmuteCommand } from './commands/unmute.js';

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
];

const rest = new REST().setToken(config.discord.token);

/**
 * Deploys slash commands to the configured guild.
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
