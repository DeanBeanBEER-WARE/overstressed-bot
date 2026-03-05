import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { webhookClient } from '../webhook/webhookClient.js';

/**
 * Slash command implementation for /top.
 * Displays a leaderboard based on KDA or Playtime using the webhook bridge.
 */
export const topCommand = {
  data: new SlashCommandBuilder()
    .setName('top')
    .setDescription('Show the top 10 players')
    .setDMPermission(false)
    .addSubcommand(subcommand =>
      subcommand
        .setName('kda')
        .setDescription('Show top 10 players by KDA ratio')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('playtime')
        .setDescription('Show top 10 players by playtime')
    ),

  /**
   * Executes the /top command.
   * @param {import('discord.js').ChatInputCommandInteraction} interaction - The interaction object.
   * @returns {Promise<void>}
   */
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const sortBy = interaction.options.getSubcommand();

    try {
      // Request leaderboard data via Webhook bridge
      const results = await webhookClient.notify({
        action: 'get_top_players',
        sortBy: sortBy
      });

      // Find the first successful response with data
      const success = results.find(r => r && r.ok && r.data);

      if (!success) {
        return interaction.editReply({
          content: 'Failed to retrieve leaderboard data from the server.'
        });
      }

      const { players } = success.data;

      if (!players || players.length === 0) {
        return interaction.editReply({
          content: 'No player data available for the leaderboard.'
        });
      }

      const embed = new EmbedBuilder()
        .setTitle(`🏆 Top 10 Players by ${sortBy === 'kda' ? 'KDA Ratio' : 'Playtime'}`)
        .setColor(0xf1c40f)
        .setTimestamp();

      const list = players.map((p, index) => {
        const value = sortBy === 'kda' 
          ? `KDA: \`${p.kda?.toFixed(2) ?? '0.00'}\`` 
          : `Playtime: \`${p.playtime?.toFixed(1) ?? '0.0'}\`h`;
        
        return `${index + 1}. **${p.minecraftName}** — ${value}`;
      }).join('\n');

      embed.setDescription(list);

      await interaction.editReply({
        embeds: [embed]
      });

    } catch (error) {
      console.error('[TopCommand] Error requesting leaderboard:', error);
      await interaction.editReply({
        content: 'There was an error while communicating with the server bridge.'
      });
    }
  },
};
