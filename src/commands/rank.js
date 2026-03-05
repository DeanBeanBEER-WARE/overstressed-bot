import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { rankService } from '../services/rankService.js';
import { config } from '../config/config.js';
import { isSupportedRank, ranks } from '../config/ranks.js';

/**
 * Slash command implementation for /rank.
 * Handles adding and removing ranks from users.
 */
export const rankCommand = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Manage user ranks')
    .setDMPermission(false) // Guild-only command
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a rank to a user')
        .addUserOption(option =>
          option.setName('user').setDescription('The user to give the rank to').setRequired(true)
        )
        .addStringOption(option =>
          option.setName('rank').setDescription('The rank to add (e.g., test)').setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('minecraftname')
            .setDescription('Exact Minecraft username of the target player.')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a rank from a user')
        .addUserOption(option =>
          option.setName('user').setDescription('The user to remove the rank from').setRequired(true)
        )
        .addStringOption(option =>
          option.setName('rank').setDescription('The rank to remove (e.g., test)').setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('minecraftname')
            .setDescription('Exact Minecraft username of the target player.')
            .setRequired(true)
        )
    ),

  /**
   * Executes the /rank command.
   * Processes adding or removing a rank and includes the Minecraft name in the webhook.
   * @param {import('discord.js').ChatInputCommandInteraction} interaction - The interaction object.
   * @returns {Promise<void>}
   */
  async execute(interaction) {
    // Permission check: Only Admin role or Administrator permission
    const hasPermission =
      (config.discord.adminRoleId && interaction.member.roles.cache.has(config.discord.adminRoleId)) ||
      interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasPermission) {
      return interaction.reply({
        content: 'You do not have permission to use this command. You need "Manage Roles" permission or the Admin role.',
        ephemeral: true,
      });
    }

    const subcommand = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser('user');
    const rankKey = interaction.options.getString('rank');
    const minecraftName = interaction.options.getString('minecraftname');

    // Basic Minecraft name validation
    if (!minecraftName || minecraftName.length < 3 || minecraftName.length > 16 || !/^\w+$/.test(minecraftName)) {
      return interaction.reply({
        content: `Error: "${minecraftName}" is not a valid Minecraft username.`,
        ephemeral: true,
      });
    }

    // Basic rank validation
    if (!isSupportedRank(rankKey)) {
      const supportedRanks = Object.keys(ranks).join(', ');
      return interaction.reply({
        content: `Error: Rank "${rankKey}" is not supported. Currently supported: ${supportedRanks}`,
        ephemeral: true,
      });
    }

    // Defer reply as role management and webhook might take a moment
    await interaction.deferReply();

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      return interaction.editReply('Error: Could not find that user in this guild.');
    }

    let result;
    if (subcommand === 'add') {
      result = await rankService.addRank(targetMember, rankKey, minecraftName);
    } else if (subcommand === 'remove') {
      result = await rankService.removeRank(targetMember, rankKey, minecraftName);
    }

    await interaction.editReply(result.message);
  },
};
