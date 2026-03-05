import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { webhookClient } from '../webhook/webhookClient.js';

/**
 * Slash command implementation for /whitelist.
 * Restricted to users with the Staff role.
 */
export const whitelistCommand = {
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Manage Minecraft server whitelist')
    .setDMPermission(false)
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a player to the whitelist')
        .addStringOption(option =>
          option.setName('minecraftname').setDescription('The Minecraft username to whitelist').setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a player from the whitelist')
        .addStringOption(option =>
          option.setName('minecraftname').setDescription('The Minecraft username to remove').setRequired(true)
        )
    ),

  /**
   * Executes the /whitelist command.
   * @param {import('discord.js').ChatInputCommandInteraction} interaction - The interaction object.
   * @returns {Promise<void>}
   */
  async execute(interaction) {
    const STAFF_ROLE_ID = '1468270339099201672';

    // Check if user has the Staff role or Administrator permission
    const hasRole = interaction.member.roles.cache.has(STAFF_ROLE_ID) || interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasRole) {
      return interaction.reply({
        content: 'You do not have permission to use this command. Staff role is required.',
        ephemeral: true,
      });
    }

    const subcommand = interaction.options.getSubcommand();
    const minecraftName = interaction.options.getString('minecraftname');

    // Basic Minecraft name validation
    if (!minecraftName || minecraftName.length < 3 || minecraftName.length > 16 || !/^\w+$/.test(minecraftName)) {
      return interaction.reply({
        content: `Error: "${minecraftName}" is not a valid Minecraft username.`,
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const action = subcommand === 'add' ? 'whitelist_add' : 'whitelist_remove';
      
      await webhookClient.notify({
        action: action,
        minecraftName: minecraftName,
      });

      const message = subcommand === 'add' 
        ? `Request to **whitelist** player \`${minecraftName}\` has been sent to the servers.`
        : `Request to **remove** player \`${minecraftName}\` from the whitelist has been sent to the servers.`;

      await interaction.editReply({
        content: message
      });
    } catch (error) {
      console.error('[WhitelistCommand] Error sending webhook:', error);
      await interaction.editReply({
        content: 'Failed to communicate with the Minecraft servers. Please try again later.'
      });
    }
  },
};
