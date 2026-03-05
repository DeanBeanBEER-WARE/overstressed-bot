import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { linkService } from '../services/linkService.js';
import { config } from '../config/config.js';
import { webhookClient } from '../webhook/webhookClient.js';

/**
 * Slash command implementation for /unlink.
 * Allows users to unlink their own account, or admins to unlink any account.
 */
export const unlinkCommand = {
  data: new SlashCommandBuilder()
    .setName('unlink')
    .setDescription('Unlink a Discord account from a Minecraft username')
    .setDMPermission(false)
    .addStringOption(option =>
      option
        .setName('minecraftname')
        .setDescription('Minecraft username to unlink (required if unlinking others)')
        .setRequired(false)
    ),

  /**
   * Executes the /unlink command.
   * @param {import('discord.js').ChatInputCommandInteraction} interaction - The interaction object.
   * @returns {Promise<void>}
   */
  async execute(interaction) {
    const targetMcName = interaction.options.getString('minecraftname');
    
    // If no MC name is provided, the user wants to unlink themselves
    if (!targetMcName) {
      const currentMcName = linkService.getMinecraftName(interaction.user.id);
      if (!currentMcName) {
        return interaction.reply({
          content: 'You do not have a Minecraft account linked to your Discord.',
          ephemeral: true,
        });
      }

      linkService.unlink(interaction.user.id);
      
      // Notify Minecraft server about the unlink
      await webhookClient.sendUnlink(interaction.user.id, currentMcName);
      
      // Reset Discord nickname to original username
      try {
        await interaction.member.setNickname(null);
      } catch (error) {
        console.error('[UnlinkCommand] Failed to reset nickname:', error);
        // Non-critical - don't fail the command if nickname change fails
      }
      
      return interaction.reply({
        content: `Successfully unlinked your Discord account from Minecraft account **${currentMcName}**.`,
        ephemeral: true,
      });
    }

    // If an MC name is provided, check for admin permissions
    const hasPermission =
      (config.discord.adminRoleId && interaction.member.roles.cache.has(config.discord.adminRoleId)) ||
      interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasPermission) {
      return interaction.reply({
        content: 'You do not have permission to unlink other users. Please use `/unlink` without arguments to unlink yourself.',
        ephemeral: true,
      });
    }

    // Find the Discord ID for the given MC name
    const targetDiscordId = linkService.getDiscordIdByMinecraftName(targetMcName);
    if (!targetDiscordId) {
      return interaction.reply({
        content: `No Discord account found linked to Minecraft username **${targetMcName}**.`,
        ephemeral: true,
      });
    }

    linkService.unlink(targetDiscordId);
    
    // Notify Minecraft server about the unlink
    await webhookClient.sendUnlink(targetDiscordId, targetMcName);
    
    // Reset Discord nickname to original username for the target user
    try {
      const targetMember = await interaction.guild.members.fetch(targetDiscordId);
      await targetMember.setNickname(null);
    } catch (error) {
      console.error('[UnlinkCommand] Failed to reset nickname for target user:', error);
      // Non-critical - don't fail the command if nickname change fails
    }
    
    await interaction.reply({
      content: `Admin Action: Successfully unlinked Minecraft account **${targetMcName}** from Discord user <@${targetDiscordId}>.`,
      ephemeral: true,
    });
  },
};
