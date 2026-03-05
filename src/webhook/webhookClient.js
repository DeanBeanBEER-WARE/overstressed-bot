import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Webhook client for communicating with one or more Minecraft NeoForge server plugins.
 */
export class WebhookClient {
  constructor() {
    this.webhooksPath = join(process.cwd(), 'webhooks.json');
  }

  /**
   * Loads the list of webhooks from webhooks.json.
   * @returns {Array<{name: string, url: string, secret: string}>}
   */
  loadWebhooks() {
    try {
      const data = readFileSync(this.webhooksPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`[WebhookClient] Failed to load webhooks.json: ${error.message}`);
      return [];
    }
  }

  /**
   * Sends a notification to all configured Minecraft server webhooks.
   * @param {Object} data - The payload to send.
   */
  async notify(data) {
    const webhooks = this.loadWebhooks();

    if (webhooks.length === 0) {
      console.warn('[WebhookClient] No webhooks configured in webhooks.json');
      return;
    }

    const requests = webhooks.map(async (webhook) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': webhook.secret,
          },
          body: JSON.stringify(data),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[Webhook][${webhook.name}] Failed to notify. Status: ${response.status}. Action: ${data.action}. Response: ${errorText}`);
          return { name: webhook.name, ok: false, status: response.status };
        }

        // Return parsed JSON if available
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const responseData = await response.json();
          return { name: webhook.name, ok: true, data: responseData };
        }

        return { name: webhook.name, ok: true };
      } catch (error) {
        if (error.name === 'AbortError') {
          console.error(`[Webhook][${webhook.name}] Request timed out after 5 seconds.`);
        } else {
          console.error(`[Webhook][${webhook.name}] Error during call:`, error.message);
        }
      }
    });

    const results = await Promise.allSettled(requests);
    return results.map(res => res.status === 'fulfilled' ? res.value : { ok: false, error: res.reason });
  }

  /**
   * Sends a chat message to all configured Minecraft server webhooks.
   * @param {string} discordUsername - The Discord tag of the sender.
   * @param {string} message - The message content.
   * @param {string|null} [minecraftName=null] - The linked Minecraft name.
   */
  async sendChatMessage(discordUsername, message, minecraftName = null) {
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    await this.notify({
      action: 'chat',
      discordUsername: discordUsername,
      message: message,
      timestamp: timestamp,
      minecraftName: minecraftName,
    });
  }

  /**
   * Sends a verification code to all configured Minecraft server webhooks.
   */
  async sendVerification(discordId, minecraftName, code) {
    await this.notify({
      action: 'verify',
      discordId: discordId,
      minecraftName: minecraftName,
      code: code,
    });
  }

  /**
   * Notifies the Minecraft server that a player has been unlinked.
   * @param {string} discordId - The Discord ID of the user.
   * @param {string} minecraftName - The Minecraft username.
   */
  async sendUnlink(discordId, minecraftName) {
    await this.notify({
      action: 'unlink',
      discordId: discordId,
      minecraftName: minecraftName,
    });
  }

  /**
   * Queries the Minecraft server for the current verification status of a player.
   * @param {string} minecraftName - The Minecraft username to query.
   * @returns {Promise<Array>} Array of webhook responses with verification data.
   */
  async getVerifiedUser(minecraftName) {
    return await this.notify({
      action: 'get_verified_user',
      minecraftName: minecraftName,
    });
  }
}

export const webhookClient = new WebhookClient();
