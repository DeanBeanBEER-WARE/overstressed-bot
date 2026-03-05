import { Client, GatewayIntentBits, Collection, Events } from 'discord.js';
import { rankCommand } from '../commands/rank.js';
import { linkCommand } from '../commands/link.js';
import { unlinkCommand } from '../commands/unlink.js';
import { whitelistCommand } from '../commands/whitelist.js';
import { resyncCommand } from '../commands/resync.js';
import { onlineCommand } from '../commands/online.js';
import { tpsCommand } from '../commands/tps.js';
import { statsCommand } from '../commands/stats.js';
import { kickCommand } from '../commands/kick.js';
import { broadcastCommand } from '../commands/broadcast.js';
import { uptimeCommand } from '../commands/uptime.js';
import { topCommand } from '../commands/top.js';
import { stopCommand } from '../commands/stop.js';
import { restartCommand } from '../commands/restart.js';
import { consoleCommand } from '../commands/console.js';
import { maintenanceCommand } from '../commands/maintenance.js';
import { purgeCommand } from '../commands/purge.js';
import { config } from '../config/config.js';
import { webhookClient } from '../webhook/webhookClient.js';
import { linkService } from '../services/linkService.js';

/**
 * Initializes and configures the Discord client.
 */
export async function createClient() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  // Store commands in a Collection for easy access
  client.commands = new Collection();
  client.commands.set(rankCommand.data.name, rankCommand);
  client.commands.set(linkCommand.data.name, linkCommand);
  client.commands.set(unlinkCommand.data.name, unlinkCommand);
  client.commands.set(whitelistCommand.data.name, whitelistCommand);
  client.commands.set(resyncCommand.data.name, resyncCommand);
  client.commands.set(onlineCommand.data.name, onlineCommand);
  client.commands.set(tpsCommand.data.name, tpsCommand);
  client.commands.set(statsCommand.data.name, statsCommand);
  client.commands.set(kickCommand.data.name, kickCommand);
  client.commands.set(broadcastCommand.data.name, broadcastCommand);
  client.commands.set(uptimeCommand.data.name, uptimeCommand);
  client.commands.set(topCommand.data.name, topCommand);
  client.commands.set(stopCommand.data.name, stopCommand);
  client.commands.set(restartCommand.data.name, restartCommand);
  client.commands.set(consoleCommand.data.name, consoleCommand);
  client.commands.set(maintenanceCommand.data.name, maintenanceCommand);
  client.commands.set(purgeCommand.data.name, purgeCommand);

  // Handle chat bridge (Discord -> Minecraft)
  client.on(Events.MessageCreate, async message => {
    // Ignore bot messages and messages outside the configured chat channel
    if (message.author.bot) return;
    if (message.channelId !== config.discord.chatChannelId) return;

    try {
      const minecraftName = linkService.getMinecraftName(message.author.id);
      await webhookClient.sendChatMessage(message.author.tag, message.content, minecraftName);
    } catch (error) {
      console.error('[Client] Error sending chat message to Minecraft:', error);
    }
  });

  /**
   * IMPORTANT: All slash command executions are logged to the configured logging channel.
   * This logic is central and applies to all current and future slash commands.
   */
  // Handle interactions (slash commands)
  client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    // Central Command Logging (non-blocking to prevent interaction timeout)
    try {
      const loggingChannel = await client.channels.fetch(config.discord.loggingChannelId).catch(() => null);
      if (loggingChannel && loggingChannel.isTextBased()) {
        const options = interaction.options.data.map(opt => {
          if (opt.type === 1) { // Subcommand
            const subOptions = opt.options?.map(subOpt => {
              if (subOpt.type === 6 || subOpt.type === 9) { // User or Mentionable
                return `${subOpt.name}: <@${subOpt.value}>`;
              }
              return `${subOpt.name}: ${subOpt.value}`;
            }).join(', ') || '';
            return `${opt.name} (${subOptions})`;
          }
          if (opt.type === 6 || opt.type === 9) { // User or Mentionable
            return `${opt.name}: <@${opt.value}>`;
          }
          return `${opt.name}: ${opt.value}`;
        }).join(', ') || 'None';

        // Fire-and-forget logging (don't await to prevent blocking command execution)
        loggingChannel.send({
          content: `📝 **Command Log**: <@${interaction.user.id}> executed \`/${interaction.commandName}\` with options: ${options} in <#${interaction.channelId}>`
        }).catch(logError => {
          console.error('[Client] Error logging command execution:', logError);
        });
      }
    } catch (logError) {
      console.error('[Client] Error fetching logging channel:', logError);
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`[Client] Error executing command ${interaction.commandName}:`, error);
      const replyOptions = { content: 'There was an error while executing this command!', ephemeral: true };
      
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(replyOptions);
      } else {
        await interaction.reply(replyOptions);
      }
    }
  });

  // Log when a member leaves the server
  client.on(Events.GuildMemberRemove, async member => {
    try {
      const loggingChannel = await client.channels.fetch(config.discord.loggingChannelId).catch(() => null);
      if (loggingChannel && loggingChannel.isTextBased()) {
        await loggingChannel.send({
          content: `**Member Left**: <@${member.id}> (\`${member.user.tag}\`) has left the server.`
        });
      }
    } catch (error) {
      console.error('[Client] Error logging member leave:', error);
    }
  });

  // Log when bot is ready
  client.once(Events.ClientReady, c => {
    console.log(`[Client] Ready! Logged in as ${c.user.tag}`);
  });

  return client;
}
