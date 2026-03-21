import { SlashCommandBuilder } from 'discord.js';
import { linkService } from '../services/linkService.js';
import { config } from '../config/config.js';
import { webhookClient } from '../webhook/webhookClient.js';
import { scannerService } from '../services/scannerService.js';

/**
 * Slash command implementation for /link.
 * Allows users with Member role to link their Minecraft username.
 * @type {Object}
 * @property {SlashCommandBuilder} data - The slash command builder configuration
 * @property {Function} execute - Command execution handler
 */
export const linkCommand = {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link your Discord account to your Minecraft username')
    .setDefaultMemberPermissions(null)
    .setDMPermission(false)
    .addStringOption(option =>
      option
        .setName('minecraftname')
        .setDescription('Your exact Minecraft username')
        .setRequired(true)
    ),

  /**
   * Executes the /link command.
   * @async
   * @param {import('discord.js').ChatInputCommandInteraction} interaction - The interaction object
   * @returns {Promise<void>}
   */
  async execute(interaction) {
    const memberRoleId = config.discord.memberRoleId;
    const adminRoleId = config.discord.adminRoleId;

    // Check if user has Member role (or Admin role)
    const hasRole =
      (memberRoleId && interaction.member.roles.cache.has(memberRoleId)) ||
      (adminRoleId && interaction.member.roles.cache.has(adminRoleId)) ||
      interaction.member.permissions.has('Administrator');

    if (!hasRole) {
      return interaction.reply({
        content: 'You need the "Member" role (or higher) to use this command.',
        ephemeral: true,
      });
    }

    const minecraftName = interaction.options.getString('minecraftname');

    // Check if user is already linked
    const existingMcName = linkService.getMinecraftName(interaction.user.id);
    if (existingMcName) {
      return interaction.reply({
        content: `Your Discord account is already linked to Minecraft account **${existingMcName}**. Please use \`/unlink\` first if you want to change it.`,
        ephemeral: true,
      });
    }

    // Check if the Minecraft name is already linked to someone else
    const existingDiscordId = linkService.getDiscordIdByMinecraftName(minecraftName);
    if (existingDiscordId) {
      return interaction.reply({
        content: `The Minecraft account **${minecraftName}** is already linked to another Discord user. If this is your account, please contact an administrator or ensure the other account is unlinked.`,
        ephemeral: true,
      });
    }

    // Basic Minecraft name validation
    if (!minecraftName || minecraftName.length < 3 || minecraftName.length > 16 || !/^\w+$/.test(minecraftName)) {
      return interaction.reply({
        content: `Error: "${minecraftName}" is not a valid Minecraft username.`,
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const code = linkService.createVerification(interaction.user.id, minecraftName);

    // Send verification code to Minecraft via Webhook
    await webhookClient.sendVerification(interaction.user.id, minecraftName, code);

    // Immediately link account (assuming MC server handles final local verification)
    linkService.link(interaction.user.id, minecraftName);

    // Force an immediate rank sync to Minecraft
    try {
      await scannerService.forceSync(interaction.member);
    } catch (error) {
      console.error('[LinkCommand] Error during forceSync:', error);
    }

    // Set Discord nickname to Minecraft name
    try {
      await interaction.member.setNickname(minecraftName);
    } catch (error) {
      console.error('[LinkCommand] Failed to set nickname:', error);
      // Non-critical - don't fail the command if nickname change fails
    }

    await interaction.editReply({
      content: `Verification code sent to Minecraft! Please log in and type: \n\n **/verify ${code}** \n\n Your Discord account has been linked. Your ranks will be synced automatically.`,
    });
  },
};
