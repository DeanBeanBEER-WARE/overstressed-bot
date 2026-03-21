import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { config } from '../config/config.js';

/**
 * Purge command - Deletes messages from the current channel
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
    /**
     * Check if user has admin role or administrator permission
     */
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

      /**
       * Discord API limits: bulkDelete only works for messages < 14 days old, max 100 per request
       */
      const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);

      await interaction.editReply({
        content: 'Starting purge... This may take a while for large channels.',
      });

      while (remainingToDelete > 0) {
        const fetchLimit = Math.min(remainingToDelete, 100);
        const fetchedMessages = await channel.messages.fetch({ limit: fetchLimit });
        
        if (fetchedMessages.size === 0) break;

        /**
         * Filter messages into recent (< 14 days) and old (>= 14 days) categories
         */
        const recentMessages = fetchedMessages.filter(
          msg => msg.createdTimestamp > twoWeeksAgo
        );
        const oldMessages = fetchedMessages.filter(
          msg => msg.createdTimestamp <= twoWeeksAgo
        );

        /**
         * Use bulkDelete for recent messages (fast operation)
         */
        if (recentMessages.size > 0) {
          const deleted = await channel.bulkDelete(recentMessages, true);
          totalDeleted += deleted.size;
        }

        /**
         * Delete old messages individually due to API restrictions (slow operation)
         */
        for (const [, message] of oldMessages) {
          try {
            await message.delete();
            totalDeleted++;
            /**
             * Apply rate limiting: 1 delete per second to avoid throttling
             */
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.error('[PurgeCommand] Failed to delete old message:', error.message);
          }
        }

        remainingToDelete -= fetchedMessages.size;

        /**
         * Report progress to user every 100 deleted messages
         */
        if (totalDeleted % 100 === 0 && totalDeleted > 0) {
          await interaction.editReply({
            content: `Purging... Deleted ${totalDeleted} messages so far.`,
          }).catch(() => {});
        }

        /**
         * Wait between batch requests to allow Discord cache to update
         * and prevent premature termination of the command
         */
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
