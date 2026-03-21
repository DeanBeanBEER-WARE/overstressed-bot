import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { webhookClient } from '../webhook/webhookClient.js';
import { linkService } from '../services/linkService.js';
import { config } from '../config/config.js';

/**
 * Slash command implementation for /mute.
 * Mutes a player on the Minecraft server using the webhook bridge.
 * @type {Object}
 * @property {SlashCommandBuilder} data - The command builder configuration
 * @property {Function} execute - The command execution handler
 */
export const muteCommand = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a player on the Minecraft server')
    .setDMPermission(false)
    .addStringOption(option => 
      option.setName('player')
        .setDescription('The Minecraft username')
        .setRequired(false))
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The Discord user')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('duration')
        .setDescription('Duration in minutes (leave empty for permanent mute)')
        .setRequired(false)
        .setMinValue(1))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('The reason for the mute')
        .setRequired(false)),

  /**
   * Executes the /mute command.
   * @param {import('discord.js').ChatInputCommandInteraction} interaction - The interaction object
   * @returns {Promise<void>}
   */
  async execute(interaction) {
    // Check if user has the Moderator role or Administrator permission
    const hasRole = interaction.member.roles.cache.has(config.discord.moderatorRoleId) || 
                    interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasRole) {
      return interaction.reply({
        content: 'You do not have permission to use this command. Moderator role is required.',
        ephemeral: true,
      });
    }

    let minecraftName = interaction.options.getString('player');
    const discordUser = interaction.options.getUser('user');
    const duration = interaction.options.getInteger('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    // Resolve Minecraft name
    if (discordUser) {
      minecraftName = linkService.getMinecraftName(discordUser.id);
      if (!minecraftName) {
        return interaction.reply({
          content: `The Discord user ${discordUser.tag} is not linked to a Minecraft account.`,
          ephemeral: true,
        });
      }
    }

    if (!minecraftName) {
      return interaction.reply({
        content: 'Please provide a player name or mention a user to mute.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const results = await webhookClient.notify({
        action: 'mute_player',
        minecraftName: minecraftName,
        duration: duration,
        reason: reason
      });

      const success = results.find(r => r && r.ok && r.data);

      if (success && success.data.success) {
        const durationText = duration ? `for ${duration} minute(s)` : 'permanently';
        await interaction.editReply({
          content: `Successfully muted \`${minecraftName}\` ${durationText}.`
        });
      } else {
        await interaction.editReply({
          content: `Failed to mute \`${minecraftName}\`. ${success?.data?.message || 'The player might be offline.'}`
        });
      }

    } catch (error) {
      console.error('[MuteCommand] Error requesting player mute:', error);
      await interaction.editReply({
        content: 'There was an error while communicating with the server bridge.'
      });
    }
  },
};
