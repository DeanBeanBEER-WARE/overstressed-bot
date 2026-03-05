import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { webhookClient } from '../webhook/webhookClient.js';
import { config } from '../config/config.js';

/**
 * Slash command implementation for /stop.
 * Stops the Minecraft server using the webhook bridge.
 */
export const stopCommand = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop the Minecraft server')
    .setDMPermission(false),

  /**
   * Executes the /stop command.
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
      // Send stop request via Webhook bridge
      const results = await webhookClient.notify({
        action: 'stop_server'
      });

      const success = results.find(r => r && r.ok && r.data);

      if (success && success.data.success) {
        await interaction.editReply({
          content: 'Server shutdown command has been sent successfully.'
        });
      } else {
        await interaction.editReply({
          content: 'Failed to stop the server. The bridge mod might not be responding or is already shutting down.'
        });
      }

    } catch (error) {
      console.error('[StopCommand] Error requesting server stop:', error);
      await interaction.editReply({
        content: 'There was an error while communicating with the server bridge.'
      });
    }
  },
};
