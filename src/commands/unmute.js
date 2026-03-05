import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { webhookClient } from '../webhook/webhookClient.js';
import { linkService } from '../services/linkService.js';
import { config } from '../config/config.js';

/**
 * Slash command implementation for /unmute.
 * Unmutes a player on the Minecraft server using the webhook bridge.
 */
export const unmuteCommand = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Unmute a player on the Minecraft server')
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
   * Executes the /unmute command.
   * @param {import('discord.js').ChatInputCommandInteraction} interaction - The interaction object.
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
        content: 'Please provide a player name or mention a user to unmute.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      // Send unmute request via Webhook bridge
      const results = await webhookClient.notify({
        action: 'unmute_player',
        minecraftName: minecraftName
      });

      const success = results.find(r => r && r.ok && r.data);

      if (success && success.data.success) {
        await interaction.editReply({
          content: `Successfully unmuted \`${minecraftName}\`.`
        });
      } else {
        await interaction.editReply({
          content: `Failed to unmute \`${minecraftName}\`. ${success?.data?.message || 'The player might not be muted.'}`
        });
      }

    } catch (error) {
      console.error('[UnmuteCommand] Error requesting player unmute:', error);
      await interaction.editReply({
        content: 'There was an error while communicating with the server bridge.'
      });
    }
  },
};
