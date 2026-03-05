import { linkService } from './linkService.js';
import { ranks } from '../config/ranks.js';
import { webhookClient } from '../webhook/webhookClient.js';
import { config } from '../config/config.js';

/**
 * Service for scanning Discord members for rank changes and notifying Minecraft.
 */
export class ScannerService {
  constructor() {
    this.client = null;
    this.scanInterval = null;
    // Cache to store the last known ranks for each user to avoid redundant webhooks
    // Format: { discordId: [rankKey1, rankKey2] }
    this.lastKnownRanks = {};
  }

  /**
   * Initializes the scanner with the Discord client and starts the interval.
   * @param {import('discord.js').Client} client - The Discord client.
   */
  start(client) {
    this.client = client;
    console.log('[ScannerService] Starting minutely scan interval...');
    
    // Initial scan after a short delay to allow client to be fully ready
    setTimeout(() => this.scanAll(), 10000);

    // Set up the interval (once per minute)
    this.scanInterval = setInterval(() => this.scanAll(), 60000);
  }

  /**
   * Scans all linked members in the configured guild.
   */
  async scanAll() {
    if (!this.client) return;

    try {
      const guild = await this.client.guilds.fetch(config.discord.guildId);
      if (!guild) {
        console.error(`[ScannerService] Could not fetch guild with ID ${config.discord.guildId}`);
        return;
      }

      const links = linkService.getAllLinks();
      const discordIds = Object.keys(links);

      if (discordIds.length === 0) return;

      for (const discordId of discordIds) {
        try {
          const member = await guild.members.fetch(discordId).catch(() => null);
          if (member) {
            await this.scanMember(member);
          }
        } catch (error) {
          console.error(`[ScannerService] Error scanning member ${discordId}:`, error.message);
        }
      }
    } catch (error) {
      console.error('[ScannerService] Critical error during scanAll:', error);
    }
  }

  /**
   * Scans a single member for rank changes.
   * @param {import('discord.js').GuildMember} member - The guild member to scan.
   */
  async scanMember(member) {
    const minecraftName = linkService.getMinecraftName(member.id);
    if (!minecraftName) return;

    // Identify which configured ranks the user currently has
    const currentRanks = Object.entries(ranks)
      .filter(([_, data]) => member.roles.cache.has(data.roleId))
      .map(([key, _]) => key);

    const previousRanks = this.lastKnownRanks[member.id];
    
    // If this is the first time we see this user (previousRanks is undefined),
    // we just populate the cache and skip sending webhooks to prevent spam on startup.
    if (previousRanks === undefined) {
      this.lastKnownRanks[member.id] = currentRanks;
      return;
    }

    // Check for new ranks added
    const added = currentRanks.filter(rank => !previousRanks.includes(rank));
    // Check for ranks removed
    const removed = previousRanks.filter(rank => !currentRanks.includes(rank));

    // If no changes, skip webhook
    if (added.length === 0 && removed.length === 0) {
      return;
    }

    // Update cache
    this.lastKnownRanks[member.id] = currentRanks;

    // Send webhooks for each change
    for (const rankKey of added) {
      await webhookClient.notify({
        action: 'add',
        rank: rankKey,
        discordUserId: member.id,
        discordUsername: member.user.tag,
        minecraftName: minecraftName,
      });
    }

    for (const rankKey of removed) {
      await webhookClient.notify({
        action: 'remove',
        rank: rankKey,
        discordUserId: member.id,
        discordUsername: member.user.tag,
        minecraftName: minecraftName,
      });
    }
  }

  /**
   * Resets the rank cache for a specific user, forcing a re-sync on the next scan.
   * @param {string} discordId - The Discord user ID.
   */
  resetCache(discordId) {
    delete this.lastKnownRanks[discordId];
  }

  /**
   * Forces an immediate push of all current ranks for a member to Minecraft.
   * Used during linking or manual resync.
   * @param {import('discord.js').GuildMember} member - The guild member.
   */
  async forceSync(member) {
    const minecraftName = linkService.getMinecraftName(member.id);
    if (!minecraftName) return;

    const currentRanks = Object.entries(ranks)
      .filter(([_, data]) => member.roles.cache.has(data.roleId))
      .map(([key, _]) => key);

    // Update cache to reflect current state
    this.lastKnownRanks[member.id] = currentRanks;

    // Push all current ranks as 'add' actions to ensure Minecraft is up to date
    for (const rankKey of currentRanks) {
      await webhookClient.notify({
        action: 'add',
        rank: rankKey,
        discordUserId: member.id,
        discordUsername: member.user.tag,
        minecraftName: minecraftName,
      });
    }

  }
}

export const scannerService = new ScannerService();
