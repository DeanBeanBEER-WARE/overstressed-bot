import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const linksPath = join(process.cwd(), 'links.json');

/**
 * Service for managing permanent links between Discord users and Minecraft usernames.
 * Also handles temporary verification codes.
 */
export class LinkService {
  constructor() {
    this.links = this.loadLinks();
    /**
     * Temporary storage for pending verifications.
     * Format: { minecraftName: { discordId: string, code: string, expires: number } }
     */
    this.pendingVerifications = {};
  }

  /**
   * Loads links from the JSON file.
   * @returns {Object}
   */
  loadLinks() {
    if (!existsSync(linksPath)) {
      return {};
    }
    try {
      const data = readFileSync(linksPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`[LinkService] Failed to load links: ${error.message}`);
      return {};
    }
  }

  /**
   * Saves links to the JSON file.
   */
  saveLinks() {
    try {
      writeFileSync(linksPath, JSON.stringify(this.links, null, 2), 'utf8');
    } catch (error) {
      console.error(`[LinkService] Failed to save links: ${error.message}`);
    }
  }

  /**
   * Links a Discord user to a Minecraft username.
   * @param {string} discordId - The Discord user ID.
   * @param {string} minecraftName - The Minecraft username.
   */
  link(discordId, minecraftName) {
    this.links[discordId] = minecraftName;
    this.saveLinks();
  }

  /**
   * Gets the Minecraft username for a Discord user.
   * @param {string} discordId - The Discord user ID.
   * @returns {string|null}
   */
  getMinecraftName(discordId) {
    return this.links[discordId] || null;
  }

  /**
   * Gets all linked accounts.
   * @returns {Object}
   */
  getAllLinks() {
    return this.links;
  }

  /**
   * Gets the Discord ID linked to a Minecraft name.
   * @param {string} minecraftName - The Minecraft username.
   * @returns {string|null}
   */
  getDiscordIdByMinecraftName(minecraftName) {
    const target = minecraftName.toLowerCase();
    for (const [discordId, mcName] of Object.entries(this.links)) {
      if (mcName.toLowerCase() === target) {
        return discordId;
      }
    }
    return null;
  }

  /**
   * Removes a link by Discord ID.
   * @param {string} discordId - The Discord user ID.
   * @returns {boolean} True if a link was removed.
   */
  unlink(discordId) {
    if (this.links[discordId]) {
      delete this.links[discordId];
      this.saveLinks();
      return true;
    }
    return false;
  }

  /**
   * Creates a temporary verification code for a user.
   * @param {string} discordId - The Discord user ID.
   * @param {string} minecraftName - The Minecraft username.
   * @returns {string} The generated 6-digit code.
   */
  createVerification(discordId, minecraftName) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.pendingVerifications[minecraftName.toLowerCase()] = {
      discordId,
      code,
      expires: Date.now() + 10 * 60 * 1000, // 10 minutes
    };
    return code;
  }

  /**
   * Confirms a verification code.
   * @param {string} minecraftName - The Minecraft username.
   * @param {string} code - The code provided by the player in-game.
   * @returns {string|null} The Discord ID if successful, otherwise null.
   */
  confirmVerification(minecraftName, code) {
    const pending = this.pendingVerifications[minecraftName.toLowerCase()];
    if (!pending) return null;

    if (Date.now() > pending.expires) {
      delete this.pendingVerifications[minecraftName.toLowerCase()];
      return null;
    }

    if (pending.code === code) {
      this.link(pending.discordId, minecraftName);
      delete this.pendingVerifications[minecraftName.toLowerCase()];
      return pending.discordId;
    }

    return null;
  }
}

export const linkService = new LinkService();
