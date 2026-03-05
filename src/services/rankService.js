import { getRoleIdForRank, isSupportedRank } from '../config/ranks.js';
import { webhookClient } from '../webhook/webhookClient.js';

/**
 * Service for managing Discord roles as ranks and notifying external systems.
 */
export class RankService {
  /**
   * Adds a rank to a user and notifies the Minecraft server.
   * @param {import('discord.js').GuildMember} member - The target guild member.
   * @param {string} rankKey - The internal rank key.
   * @param {string} minecraftName - The Minecraft username to include in the webhook.
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async addRank(member, rankKey, minecraftName) {
    if (!isSupportedRank(rankKey)) {
      return { success: false, message: `Rank "${rankKey}" is not supported.` };
    }

    const roleId = getRoleIdForRank(rankKey);
    const role = member.guild.roles.cache.get(roleId);

    if (!role) {
      console.error(`[RankService] Role with ID ${roleId} not found in guild ${member.guild.id}.`);
      return { success: false, message: 'The corresponding Discord role for this rank does not exist.' };
    }

    try {
      if (member.roles.cache.has(roleId)) {
        return { success: false, message: `User already has the "${rankKey}" rank.` };
      }

      await member.roles.add(role);
      console.log(`[RankService] Added role ${role.name} to ${member.user.tag}`);

      // Notify Minecraft server
      await webhookClient.notify({
        action: 'add',
        rank: rankKey,
        discordUserId: member.id,
        discordUsername: member.user.tag,
        minecraftName: minecraftName,
      });

      return { success: true, message: `Successfully added rank "${rankKey}" to ${member.user.tag}.` };
    } catch (error) {
      console.error(`[RankService] Error adding role to user ${member.id}:`, error);
      return { success: false, message: 'Failed to add the Discord role. Check bot permissions.' };
    }
  }

  /**
   * Removes a rank from a user and notifies the Minecraft server.
   * @param {import('discord.js').GuildMember} member - The target guild member.
   * @param {string} rankKey - The internal rank key.
   * @param {string} minecraftName - The Minecraft username to include in the webhook.
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async removeRank(member, rankKey, minecraftName) {
    if (!isSupportedRank(rankKey)) {
      return { success: false, message: `Rank "${rankKey}" is not supported.` };
    }

    const roleId = getRoleIdForRank(rankKey);

    try {
      if (!member.roles.cache.has(roleId)) {
        return { success: false, message: `User does not have the "${rankKey}" rank.` };
      }

      await member.roles.remove(roleId);
      console.log(`[RankService] Removed role ID ${roleId} from ${member.user.tag}`);

      // Notify Minecraft server
      await webhookClient.notify({
        action: 'remove',
        rank: rankKey,
        discordUserId: member.id,
        discordUsername: member.user.tag,
        minecraftName: minecraftName,
      });

      return { success: true, message: `Successfully removed rank "${rankKey}" from ${member.user.tag}.` };
    } catch (error) {
      console.error(`[RankService] Error removing role from user ${member.id}:`, error);
      return { success: false, message: 'Failed to remove the Discord role. Check bot permissions.' };
    }
  }
}

export const rankService = new RankService();
