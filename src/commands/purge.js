import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { config } from '../config/config.js';

/**
 * Slash command implementation for /purge.
 * Deletes all messages in the current channel (admin only).
 */
export const purgeCommand = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete all messages in the current channel')
    .setDMPermission(false)
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('Number of messages to delete (default: all)')
        .setRequired(false)
        .setMinValue(1)
    ),

  /**
   * Executes the /purge command.
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

    await interaction.deferReply({ ephemeral: true });

    const amount = interaction.options.getInteger('amount') || Number.MAX_SAFE_INTEGER;
    const channel = interaction.channel;

    try {
      let totalDeleted = 0;
      let remainingToDelete = amount;

      // Discord limits: bulkDelete only works for messages < 14 days, max 100 per request
      const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);

      await interaction.editReply({
        content: 'Starting purge... This may take a while for large channels.',
      });

      while (remainingToDelete > 0) {
        const fetchLimit = Math.min(remainingToDelete, 100);
        const fetchedMessages = await channel.messages.fetch({ limit: fetchLimit });
        
        if (fetchedMessages.size === 0) break;

        // Separate recent and old messages
        const recentMessages = fetchedMessages.filter(
          msg => msg.createdTimestamp > twoWeeksAgo
        );
        const oldMessages = fetchedMessages.filter(
          msg => msg.createdTimestamp <= twoWeeksAgo
        );

        // Bulk delete recent messages (fast)
        if (recentMessages.size > 0) {
          const deleted = await channel.bulkDelete(recentMessages, true);
          totalDeleted += deleted.size;
        }

        // Individually delete old messages (slow)
        for (const [, message] of oldMessages) {
          try {
            await message.delete();
            totalDeleted++;
            // Rate limit protection: 1 delete per second for old messages
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.error('[PurgeCommand] Failed to delete old message:', error.message);
          }
        }

        remainingToDelete -= fetchedMessages.size;

        // Update progress every 100 messages
        if (totalDeleted % 100 === 0 && totalDeleted > 0) {
          await interaction.editReply({
            content: `Purging... Deleted ${totalDeleted} messages so far.`,
          }).catch(() => {}); // Ignore edit errors
        }

        // Wait between batches to let Discord update its cache
        // This prevents the command from stopping prematurely
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      await interaction.editReply({
        content: `Successfully deleted ${totalDeleted} message(s) from <#${channel.id}>.`,
      });

    } catch (error) {
      console.error('[PurgeCommand] Error during purge:', error);
      await interaction.editReply({
        content: `Purge stopped. Deleted ${totalDeleted} messages before error: ${error.message}`,
      }).catch(() => {});
    }
  },
};
