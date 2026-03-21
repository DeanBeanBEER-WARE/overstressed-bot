import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { webhookClient } from '../webhook/webhookClient.js';
import { config } from '../config/config.js';

/**
 * Slash command implementation for /broadcast.
 * Sends a global announcement to the Minecraft server.
 */
/**
 * Broadcast command for sending global announcements to the Minecraft server.
 * @type {Object}
 * @property {SlashCommandBuilder} data - The slash command builder configuration
 * @property {Function} execute - Executes the broadcast command
 * 
 * @description
 * This command allows users with Admin role or Administrator permissions to send
 * global announcements to the connected Minecraft server via webhook bridge.
 * 
 * @example
 * // Usage in Discord
 * /broadcast message: "Server maintenance in 10 minutes"
 */
export const broadcastCommand = {
  data: new SlashCommandBuilder()
    .setName('broadcast')
    .setDescription('Send a global announcement to the Minecraft server')
    .setDMPermission(false)
    .addStringOption(option =>
      option.setName('message')
        .setDescription('The message to broadcast')
        .setRequired(true)),

  /**
   * Executes the /broadcast command.
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

    const message = interaction.options.getString('message');

    await interaction.deferReply({ ephemeral: true });

    try {
      // Send broadcast request via Webhook bridge
      const results = await webhookClient.notify({
        action: 'broadcast_message',
        message: message,
        sender: interaction.user.tag
      });

      const success = results.some(r => r && r.ok);

      if (success) {
        await interaction.editReply({
          content: `Announcement broadcasted to the server: \`${message}\``
        });
      } else {
        await interaction.editReply({
          content: 'Failed to broadcast the message. The server bridge might be offline.'
        });
      }

    } catch (error) {
      console.error('[BroadcastCommand] Error sending broadcast:', error);
      await interaction.editReply({
        content: 'There was an error while communicating with the server bridge.'
      });
    }
  },
};
