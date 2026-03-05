import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { webhookClient } from '../webhook/webhookClient.js';
import { config } from '../config/config.js';

/**
 * Slash command implementation for /restart.
 * Restarts the Minecraft server using the webhook bridge.
 */
export const restartCommand = {
  data: new SlashCommandBuilder()
    .setName('restart')
    .setDescription('Restart the Minecraft server')
    .setDMPermission(false),

  /**
   * Executes the /restart command.
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

    await interaction.deferReply({ ephemeral: true });

    try {
      // Send restart request via Webhook bridge
      const results = await webhookClient.notify({
        action: 'restart_server'
      });

      const success = results.find(r => r && r.ok && r.data);

      if (success && success.data.success) {
        await interaction.editReply({
          content: 'Server restart command has been sent successfully.'
        });
      } else {
        await interaction.editReply({
          content: 'Failed to restart the server. The bridge mod might not be responding.'
        });
      }

    } catch (error) {
      console.error('[RestartCommand] Error requesting server restart:', error);
      await interaction.editReply({
        content: 'There was an error while communicating with the server bridge.'
      });
    }
  },
};
