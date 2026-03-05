import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { webhookClient } from '../webhook/webhookClient.js';
import { config } from '../config/config.js';

/**
 * Slash command implementation for /online.
 * Displays online players using the webhook bridge.
 */
export const onlineCommand = {
  data: new SlashCommandBuilder()
    .setName('online')
    .setDescription('Show online players on the Minecraft server')
    .setDMPermission(false),

  /**
   * Executes the /online command.
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
      // Request player list via Webhook bridge
      const results = await webhookClient.notify({
        action: 'get_online_players'
      });

      // Find the first successful response with data
      const success = results.find(r => r && r.ok && r.data);

      if (!success) {
        return interaction.editReply({
          content: 'Failed to retrieve player list from the server. The bridge mod might not be responding with the required data.'
        });
      }

      const { onlineCount, maxCount, players } = success.data;

      const embed = new EmbedBuilder()
        .setTitle('Minecraft Server Status')
        .setColor(0x00ff00)
        .addFields(
          { name: 'Online Players', value: `${onlineCount ?? 0} / ${maxCount ?? 0}`, inline: true }
        )
        .setTimestamp();

      if (players && players.length > 0) {
        const names = players.sort().map(name => `\`${name}\``).join(', ');
        embed.setDescription(`**Players currently online:**\n${names}`);
      } else {
        embed.setDescription('**No players currently online.**');
        embed.setColor(0xffaa00);
      }

      await interaction.editReply({
        embeds: [embed]
      });

    } catch (error) {
      console.error('[OnlineCommand] Error requesting online players:', error);
      await interaction.editReply({
        content: 'There was an error while communicating with the server bridge.'
      });
    }
  },
};
