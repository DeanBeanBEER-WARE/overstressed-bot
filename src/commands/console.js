import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { webhookClient } from '../webhook/webhookClient.js';
import { config } from '../config/config.js';

/**
 * Slash command implementation for /console.
 * Executes a console command on the Minecraft server via the webhook bridge.
 */
/**
 * Console command for executing Minecraft server commands via Discord.
 * Requires Admin role or Administrator permission to use.
 * 
 * @typedef {Object} ConsoleCommand
 * @property {SlashCommandBuilder} data - The slash command builder configuration
 * @property {Function} execute - Executes the console command
 * 
 * @type {ConsoleCommand}
 */

/**
 * Executes the /console slash command.
 * 
 * Validates user permissions (Admin role or Administrator permission),
 * sends the command to the Minecraft server via webhook bridge,
 * and returns the execution result to the user.
 * 
 * @async
 * @function execute
 * @param {import('discord.js').ChatInputCommandInteraction} interaction - The Discord interaction object containing the command invocation details
 * @returns {Promise<void>}
 * @throws {Error} If webhook communication fails
 * 
 * @example
 * // User executes: /console command:say Hello World
 * // Bot validates permissions and sends command to server
 */
export const consoleCommand = {
  data: new SlashCommandBuilder()
    .setName('console')
    .setDescription('Execute a command on the Minecraft server console')
    .setDMPermission(false)
    .addStringOption(option =>
      option
        .setName('command')
        .setDescription('The command string to execute')
        .setRequired(true)
    ),

  /**
   * Executes the /console command.
   * @param {import('discord.js').ChatInputCommandInteraction} interaction - The interaction object.
   * @returns {Promise<void>}
   */
  async execute(interaction) {
    // Check if user has the Admin role or Administrator permission
    const hasRole = interaction.member.roles.cache.has(config.discord.adminRoleId) || 
                    interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasRole) {
      return interaction.reply({
        content: 'You do not have permission to use this command. Admin role is required.',
        ephemeral: true,
      });
    }

    const commandString = interaction.options.getString('command');
    await interaction.deferReply({ ephemeral: true });

    try {
      // Send command request via Webhook bridge
      const results = await webhookClient.notify({
        action: 'execute_command',
        command: commandString
      });

      // Filter for successful responses
      const successfulResponses = results.filter(r => r && r.ok);

      if (successfulResponses.length > 0) {
        // Collect outputs
        const outputs = successfulResponses.map(r => {
          if (r.data && r.data.output) {
            return `**${r.name || 'Server'}**: \`\`\`${r.data.output}\`\`\``;
          }
          return `**${r.name || 'Server'}**: Command executed successfully.`;
        });

        await interaction.editReply({
          content: outputs.join('\n')
        });
      } else {
        await interaction.editReply({
          content: 'Failed to execute command. The bridge mod might not be responding.'
        });
      }

    } catch (error) {
      console.error('[ConsoleCommand] Error requesting command execution:', error);
      await interaction.editReply({
        content: 'There was an error while communicating with the server bridge.'
      });
    }
  },
};
