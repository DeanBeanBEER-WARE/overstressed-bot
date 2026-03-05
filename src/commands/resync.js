import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { scannerService } from '../services/scannerService.js';
import { linkService } from '../services/linkService.js';
import { webhookClient } from '../webhook/webhookClient.js';
import { config } from '../config/config.js';

/**
 * Slash command implementation for /resync.
 * Synchronizes Discord's link database with the Minecraft server's authoritative state.
 * Server is the source of truth - Discord syncs to match server's verified_users.json.
 */
export const resyncCommand = {
  data: new SlashCommandBuilder()
    .setName('resync')
    .setDescription('Sync Discord link status with server (server is source of truth)')
    .setDMPermission(false)
    .addStringOption(option =>
      option.setName('minecraftname').setDescription('Minecraft username to sync').setRequired(true)
    ),

  /**
   * Executes the /resync command.
   * @param {import('discord.js').ChatInputCommandInteraction} interaction - The interaction object.
   * @returns {Promise<void>}
   */
  async execute(interaction) {
    // Permission check: Admin only
    const hasPermission =
      (config.discord.adminRoleId && interaction.member.roles.cache.has(config.discord.adminRoleId)) ||
      interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasPermission) {
      return interaction.reply({
        content: 'You do not have permission to use this command.',
        ephemeral: true,
      });
    }

    const minecraftName = interaction.options.getString('minecraftname');

    await interaction.deferReply({ ephemeral: true });

    try {
      // Query the server for current verification status
      const responses = await webhookClient.getVerifiedUser(minecraftName);
      
      // Get first successful response
      const serverResponse = responses?.find(r => r?.ok && r?.data);
      
      if (!serverResponse || !serverResponse.data) {
        return await interaction.editReply({
          content: `Failed to query server for player **${minecraftName}**. Server may be offline or player not found.`
        });
      }

      const { discordId, isVerified } = serverResponse.data;

      // Get current Discord link status
      const currentDiscordId = linkService.getDiscordIdByMinecraftName(minecraftName);

      if (isVerified && discordId) {
        // Server says: Player IS linked to discordId
        
        if (currentDiscordId !== discordId) {
          // Discord has wrong/no link - fix it
          if (currentDiscordId) {
            linkService.unlink(currentDiscordId); // Remove old link
          }
          linkService.link(discordId, minecraftName); // Add correct link
          
          await interaction.editReply({
            content: `Sync complete: **${minecraftName}** is now linked to <@${discordId}> (matching server state).`
          });
        } else {
          // Already in sync
          await interaction.editReply({
            content: `Already in sync: **${minecraftName}** is linked to <@${discordId}>.`
          });
        }

        // Trigger rank sync if user is in guild
        try {
          const member = await interaction.guild.members.fetch(discordId).catch(() => null);
          if (member) {
            scannerService.resetCache(discordId);
            await scannerService.forceSync(member);
          }
        } catch (rankError) {
          console.error('[ResyncCommand] Error during rank sync:', rankError);
        }

      } else {
        // Server says: Player is NOT linked
        
        if (currentDiscordId) {
          // Discord still has a link - remove it
          linkService.unlink(currentDiscordId);
          
          await interaction.editReply({
            content: `Sync complete: **${minecraftName}** is now unlinked (matching server state). Previous link to <@${currentDiscordId}> removed.`
          });
        } else {
          // Already in sync (no link)
          await interaction.editReply({
            content: `Already in sync: **${minecraftName}** is not linked on either server or Discord.`
          });
        }
      }

    } catch (error) {
      console.error('[ResyncCommand] Error during re-sync:', error);
      await interaction.editReply({
        content: `Failed to sync. Error: ${error.message}`
      });
    }
  },
};
