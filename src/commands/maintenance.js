import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { webhookClient } from '../webhook/webhookClient.js';
import { config } from '../config/config.js';
import { linkService } from '../services/linkService.js';
import { statusService } from '../services/statusService.js';

/**
 * Slash command implementation for /maintenance.
 * Manages the Minecraft server's maintenance mode and allowed players.
 */
export const maintenanceCommand = {
  data: new SlashCommandBuilder()
    .setName('maintenance')
    .setDescription('Manage Minecraft server maintenance mode')
    .setDMPermission(false)
    .addSubcommand(subcommand =>
      subcommand
        .setName('on')
        .setDescription('Activate maintenance mode')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('off')
        .setDescription('Deactivate maintenance mode')
    ),

  /**
   * Executes the /maintenance command.
   * @param {import('discord.js').ChatInputCommandInteraction} interaction - The interaction object.
   * @param {import('discord.js').Client} client - The Discord client instance.
   * @returns {Promise<void>}
   */
  async execute(interaction, client) {
    // Check if user has the Admin role or Administrator permission
    const hasRole = interaction.member.roles.cache.has(config.discord.adminRoleId) || 
                    interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasRole) {
      return interaction.reply({
        content: 'You do not have permission to use this command. Admin role is required.',
        ephemeral: true,
      });
    }

    const subcommand = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    try {
      if (subcommand === 'on') {
        // 1. Tell the server to activate maintenance mode
        const maintenanceResult = await webhookClient.notify({
          action: 'set_maintenance_mode',
          mode: true,
        });

        // Check if setting maintenance mode was successful on at least one server
        const maintenanceSuccess = maintenanceResult.some(r => r && r.ok && r.data && r.data.success);

        if (!maintenanceSuccess) {
          await interaction.editReply({ content: 'Failed to activate maintenance mode on any server.' });
          return;
        }

        // 2. Compile and send the whitelist of allowed players (Admins + Moderators)
        const guild = interaction.guild;
        if (!guild) {
          await interaction.editReply({ content: 'Could not retrieve guild information for role checks.' });
          return;
        }

        const allLinkedUsers = linkService.getAllLinks(); // { discordId: 'mcName' }
        const allowedMinecraftNames = [];

        for (const discordId of Object.keys(allLinkedUsers)) {
          try {
            const member = await guild.members.fetch(discordId);
            if (member.roles.cache.has(config.discord.adminRoleId) || 
                member.roles.cache.has(config.discord.moderatorRoleId) ||
                member.permissions.has(PermissionFlagsBits.Administrator)) {
              allowedMinecraftNames.push(allLinkedUsers[discordId]);
            }
          } catch (fetchError) {
            console.warn(`[MaintenanceCommand] Could not fetch member ${discordId}: ${fetchError.message}`);
            // Member might have left the guild, skip them
          }
        }

        const whitelistResult = await webhookClient.notify({
          action: 'update_maintenance_whitelist',
          allowedPlayers: allowedMinecraftNames,
        });

        const whitelistSuccess = whitelistResult.some(r => r && r.ok && r.data && r.data.success);

        if (maintenanceSuccess && whitelistSuccess) {
          // Update bot status to maintenance
          statusService.setMaintenanceMode(true);
          
          await interaction.editReply({
            content: `Maintenance mode activated and whitelist updated. Only Admins and Moderators (${allowedMinecraftNames.length} players) can join.`
          });
        } else if (maintenanceSuccess && !whitelistSuccess) {
            await interaction.editReply({ content: 'Maintenance mode activated, but failed to update whitelist on some servers.' });
        } else {
            await interaction.editReply({ content: 'Failed to activate maintenance mode or update whitelist.' });
        }

      } else if (subcommand === 'off') {
        // Deactivate maintenance mode and clear whitelist
        const maintenanceResult = await webhookClient.notify({
          action: 'set_maintenance_mode',
          mode: false,
        });

        const whitelistResult = await webhookClient.notify({
          action: 'update_maintenance_whitelist',
          allowedPlayers: [], // Clear the whitelist
        });

        const success = maintenanceResult.some(r => r && r.ok && r.data && r.data.success) &&
                        whitelistResult.some(r => r && r.ok && r.data && r.data.success);

        if (success) {
          // Update bot status back to normal
          statusService.setMaintenanceMode(false);
          
          await interaction.editReply({ content: 'Maintenance mode deactivated and whitelist cleared.' });
        } else {
          await interaction.editReply({ content: 'Failed to deactivate maintenance mode or clear whitelist on some servers.' });
        }
      }
    } catch (error) {
      console.error('[MaintenanceCommand] Error managing maintenance mode:', error);
      await interaction.editReply({
        content: 'There was an error while communicating with the server bridge.'
      });
    }
  },
};
