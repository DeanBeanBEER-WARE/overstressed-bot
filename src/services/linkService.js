import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const linksPath = join(process.cwd(), 'links.json');

/**
 * Manages the permanent association between Discord users and Minecraft usernames.
 * Handles temporary verification codes and persistent link storage.
 * 
 * @class LinkService
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
   * Reads and parses the persistent links from the JSON storage file.
   * 
   * @returns {Object} A dictionary mapping Discord IDs to Minecraft usernames.
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
   * Serializes and writes the current link associations to the JSON storage file.
   */
  saveLinks() {
    try {
      writeFileSync(linksPath, JSON.stringify(this.links, null, 2), 'utf8');
    } catch (error) {
      console.error(`[LinkService] Failed to save links: ${error.message}`);
    }
  }

  /**
   * Associates a Discord ID with a specific Minecraft username.
   * 
   * @param {string} discordId - The Discord user ID.
   * @param {string} minecraftName - The Minecraft username.
   */
  link(discordId, minecraftName) {
    this.links[discordId] = minecraftName;
    this.saveLinks();
  }

  /**
   * Retrieves the associated Minecraft username for a given Discord user.
   * 
   * @param {string} discordId - The Discord user ID.
   * @returns {string|null} The linked Minecraft username, or null if no link exists.
   */
  getMinecraftName(discordId) {
    return this.links[discordId] || null;
  }

  /**
   * Retrieves all currently registered Discord-to-Minecraft associations.
   * 
   * @returns {Object} A dictionary containing all established links.
   */
  getAllLinks() {
    return this.links;
  }

  /**
   * Resolves the Discord ID corresponding to a specified Minecraft username.
   * 
   * @param {string} minecraftName - The Minecraft username.
   * @returns {string|null} The linked Discord ID, or null if no link exists.
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
   * Deletes an existing link association for a specific Discord user.
   * 
   * @param {string} discordId - The Discord user ID.
   * @returns {boolean} True if a link was successfully removed, false otherwise.
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
   * Generates a temporary verification code to authenticate a linking request.
   * 
   * @param {string} discordId - The Discord user ID.
   * @param {string} minecraftName - The Minecraft username.
   * @returns {string} A randomly generated 6-digit verification code.
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
   * Validates a verification code against a pending link request.
   * 
   * @param {string} minecraftName - The Minecraft username.
   * @param {string} code - The code provided by the player.
   * @returns {string|null} The linked Discord ID on successful verification, otherwise null.
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
