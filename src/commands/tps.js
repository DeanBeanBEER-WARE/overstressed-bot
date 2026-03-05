import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { webhookClient } from '../webhook/webhookClient.js';
import { config } from '../config/config.js';

/**
 * Slash command implementation for /tps.
 * Displays server TPS and MSPT using the webhook bridge.
 */
export const tpsCommand = {
  data: new SlashCommandBuilder()
    .setName('tps')
    .setDescription('Show server performance (TPS and MSPT)')
    .setDMPermission(false),

  /**
   * Executes the /tps command.
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
      // Request TPS via Webhook bridge
      const results = await webhookClient.notify({
        action: 'get_tps'
      });

      // Find the first successful response with data
      const success = results.find(r => r && r.ok && r.data);

      if (!success) {
        return interaction.editReply({
          content: 'Failed to retrieve TPS from the server. The bridge mod might not be responding with the required data.'
        });
      }

      const { tps, mspt } = success.data;

      // Determine color based on TPS
      let color = 0x00ff00; // Green
      if (tps < 18) color = 0xffff00; // Yellow
      if (tps < 15) color = 0xffaa00; // Orange
      if (tps < 10) color = 0xff0000; // Red

      const embed = new EmbedBuilder()
        .setTitle('Server Performance')
        .setColor(color)
        .addFields(
          { name: 'TPS', value: `\`${tps?.toFixed(1) ?? '??'}\``, inline: true },
          { name: 'MSPT', value: `\`${mspt?.toFixed(1) ?? '??'}\` ms`, inline: true }
        )
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed]
      });

    } catch (error) {
      console.error('[TpsCommand] Error requesting TPS:', error);
      await interaction.editReply({
        content: 'There was an error while communicating with the server bridge.'
      });
    }
  },
};
