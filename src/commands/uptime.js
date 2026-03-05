import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { webhookClient } from '../webhook/webhookClient.js';
import { config } from '../config/config.js';

/**
 * Slash command implementation for /uptime.
 * Displays the Minecraft server uptime using the webhook bridge.
 */
export const uptimeCommand = {
  data: new SlashCommandBuilder()
    .setName('uptime')
    .setDescription('Show how long the Minecraft server has been running')
    .setDMPermission(false),

  /**
   * Executes the /uptime command.
   * @param {import('discord.js').ChatInputCommandInteraction} interaction - The interaction object.
   * @returns {Promise<void>}
   */
  async execute(interaction) {
    // Check if user has the Member role or Administrator permission
    const hasRole = interaction.member.roles.cache.has(config.discord.memberRoleId) || 
                    interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasRole) {
      return interaction.reply({
        content: 'You do not have permission to use this command. Member role is required.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      // Request uptime via Webhook bridge
      const results = await webhookClient.notify({
        action: 'get_uptime'
      });

      // Find the first successful response with data
      const success = results.find(r => r && r.ok && r.data);

      if (!success) {
        return interaction.editReply({
          content: 'Failed to retrieve uptime from the server. The bridge mod might not be responding with the required data.'
        });
      }

      const { uptimeSeconds } = success.data;

      if (uptimeSeconds === undefined) {
        return interaction.editReply({
          content: 'The server provided an invalid uptime value.'
        });
      }

      // Convert seconds to hours and minutes
      const hours = Math.floor(uptimeSeconds / 3600);
      const minutes = Math.floor((uptimeSeconds % 3600) / 60);

      const embed = new EmbedBuilder()
        .setTitle('Server Uptime')
        .setColor(0x00ae86)
        .setDescription(`The Minecraft server has been running for:\n**${hours} hours and ${minutes} minutes**`)
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed]
      });

    } catch (error) {
      console.error('[UptimeCommand] Error requesting uptime:', error);
      await interaction.editReply({
        content: 'There was an error while communicating with the server bridge.'
      });
    }
  },
};
