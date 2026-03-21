/**
 * @fileoverview Slash command implementation for /kick.
 * Kicks a player from the Minecraft server using the webhook bridge.
 */

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { webhookClient } from '../webhook/webhookClient.js';
import { linkService } from '../services/linkService.js';
import { config } from '../config/config.js';

/**
 * Slash command for kicking players from the Minecraft server.
 * @type {Object}
 * @property {SlashCommandBuilder} data - The slash command builder configuration
 * @property {Function} execute - Executes the kick command
 */
export const kickCommand = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a player from the Minecraft server')
    .setDMPermission(false)
    .addStringOption(option => 
      option.setName('player')
        .setDescription('The Minecraft username')
        .setRequired(false))
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The Discord user')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('The reason for the kick')
        .setRequired(false)),

  /**
   * Executes the /kick command.
   * @async
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
        content: 'Please provide a player name or mention a user to kick.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      // Send kick request via Webhook bridge
      const results = await webhookClient.notify({
        action: 'kick_player',
        minecraftName: minecraftName,
        reason: reason
      });

      const success = results.find(r => r && r.ok && r.data);

      if (success && success.data.success) {
        await interaction.editReply({
          content: `Successfully kicked \`${minecraftName}\` from the server.`
        });
      } else {
        await interaction.editReply({
          content: `Failed to kick \`${minecraftName}\`. ${success?.data?.message || 'The player might be offline.'}`
        });
      }

    } catch (error) {
      console.error('[KickCommand] Error requesting player kick:', error);
      await interaction.editReply({
        content: 'There was an error while communicating with the server bridge.'
      });
    }
  },
};
