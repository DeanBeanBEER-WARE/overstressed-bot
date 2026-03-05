import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { webhookClient } from '../webhook/webhookClient.js';
import { linkService } from '../services/linkService.js';
import { config } from '../config/config.js';

/**
 * Slash command implementation for /stats.
 * Displays player statistics using the webhook bridge.
 */
export const statsCommand = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Show player statistics (health, deaths, kills, playtime)')
    .setDMPermission(false)
    .addStringOption(option => 
      option.setName('player')
        .setDescription('The Minecraft username')
        .setRequired(false))
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The Discord user')
        .setRequired(false)),

  /**
   * Executes the /stats command.
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

    let minecraftName = interaction.options.getString('player');
    const discordUser = interaction.options.getUser('user');

    // If a Discord user is provided, try to find their linked Minecraft name
    if (discordUser) {
      minecraftName = linkService.getMinecraftName(discordUser.id);
      if (!minecraftName) {
        return interaction.editReply({
          content: `The Discord user ${discordUser.tag} is not linked to a Minecraft account.`
        });
      }
    }

    // If neither is provided, use the user's own linked account
    if (!minecraftName) {
      minecraftName = linkService.getMinecraftName(interaction.user.id);
      if (!minecraftName) {
        return interaction.editReply({
          content: 'Please provide a player name, mention a user, or link your own account using `/link`.'
        });
      }
    }

    try {
      // Request player stats via Webhook bridge
      const results = await webhookClient.notify({
        action: 'get_player_stats',
        minecraftName: minecraftName
      });

      // Find the first successful response with data
      const success = results.find(r => r && r.ok && r.data);

      if (!success) {
        return interaction.editReply({
          content: `Failed to retrieve statistics for \`${minecraftName}\`. The player might be offline or the bridge mod is not responding.`
        });
      }

      const { health, deaths, kills, playtime } = success.data;

      const embed = new EmbedBuilder()
        .setTitle(`Player Statistics: ${minecraftName}`)
        .setColor(0x3498db)
        .addFields(
          { name: 'Health', value: `❤️ ${health?.toFixed(1) ?? '??'}`, inline: true },
          { name: 'Playtime', value: `⏰ ${playtime?.toFixed(1) ?? '??'} hours`, inline: true },
          { name: '\u200B', value: '\u200B', inline: true }, // Spacer
          { name: 'Kills', value: `⚔️ ${kills ?? 0}`, inline: true },
          { name: 'Deaths', value: `💀 ${deaths ?? 0}`, inline: true },
          { name: 'K/D Ratio', value: `📊 ${deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2)}`, inline: true }
        )
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed]
      });

    } catch (error) {
      console.error('[StatsCommand] Error requesting player stats:', error);
      await interaction.editReply({
        content: 'There was an error while communicating with the server bridge.'
      });
    }
  },
};
