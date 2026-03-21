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
import { muteCommand } from '../commands/mute.js';
import { unmuteCommand } from '../commands/unmute.js';
import { command as syncAllRanksCommand } from '../commands/sync_all_ranks.js';
import { config } from '../config/config.js';
import { webhookClient } from '../webhook/webhookClient.js';
import { linkService } from '../services/linkService.js';

/**
 * Factory function to instantiate and configure the Discord Client.
 * Registers slash commands and sets up event listeners for messages, 
 * interactions, and guild member events.
 * 
 * @async
 * @function createClient
 * @returns {Promise<Client>} A configured instance of the Discord Client.
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

  /**
   * Command registry attached to the client for runtime access.
   * @type {Collection<string, Object>}
   */
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
  client.commands.set(muteCommand.data.name, muteCommand);
  client.commands.set(unmuteCommand.data.name, unmuteCommand);
  client.commands.set(syncAllRanksCommand.data.name, syncAllRanksCommand);

  /**
   * MessageCreate event listener.
   * Processes chat messages for the Discord to Minecraft chat bridge.
   * Filters out messages from bots and channels outside the configured chat channel.
   */
  client.on(Events.MessageCreate, async message => {
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
   * InteractionCreate event listener.
   * Handles the execution of slash commands and logs command usage centrally.
   * Ensures that command execution is tracked in the designated logging channel.
   */
  client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      const loggingChannel = await client.channels.fetch(config.discord.loggingChannelId).catch(() => null);
      if (loggingChannel && loggingChannel.isTextBased()) {
        const options = interaction.options.data.map(opt => {
          /** 
           * Format option value if it is a Subcommand. 
           */
          if (opt.type === 1) {
            const subOptions = opt.options?.map(subOpt => {
              /** 
               * Format sub-option value if it is a User or Mentionable type. 
               */
              if (subOpt.type === 6 || subOpt.type === 9) {
                return `${subOpt.name}: <@${subOpt.value}>`;
              }
              return `${subOpt.name}: ${subOpt.value}`;
            }).join(', ') || '';
            return `${opt.name} (${subOptions})`;
          }
          /** 
           * Format option value if it is a User or Mentionable type. 
           */
          if (opt.type === 6 || opt.type === 9) {
            return `${opt.name}: <@${opt.value}>`;
          }
          return `${opt.name}: ${opt.value}`;
        }).join(', ') || 'None';

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

  /**
   * GuildMemberRemove event listener.
   * Logs member departures to the configured logging channel.
   */
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

  /**
   * ClientReady event listener.
   * Triggers when the bot has successfully authenticated and connected to Discord.
   */
  client.once(Events.ClientReady, c => {
    console.log(`[Client] Ready! Logged in as ${c.user.tag}`);
  });

  return client;
}
