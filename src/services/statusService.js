import { status } from 'minecraft-server-util';
import { ActivityType } from 'discord.js';
import { config } from '../config/config.js';
import { webhookClient } from '../webhook/webhookClient.js';

export class StatusService {
  constructor() {
    this.client = null;
    this.interval = null;
    this.isMaintenanceMode = false;
  }

  /**
   * Starts the status update service.
   * @param {import('discord.js').Client} client 
   */
  start(client) {
    this.client = client;
    
    // Wait for client to be ready before starting updates
    if (client.isReady()) {
      this.init();
    } else {
      client.once('ready', () => {
        // Add a small delay to ensure initial presence packet is processed
        setTimeout(() => this.init(), 5000);
      });
    }
  }

  /**
   * Sets the maintenance mode status.
   * @param {boolean} mode - True to enable maintenance mode, false to disable
   */
  setMaintenanceMode(mode) {
    this.isMaintenanceMode = mode;
    console.log(`[StatusService] Maintenance mode set to: ${mode}`);
    // Immediately update status when maintenance mode changes
    this.updateStatus();
  }

  init() {
    console.log('[StatusService] Starting status updates...');
    
    // Initial update
    this.updateStatus();

    // Update every 5 seconds
    this.interval = setInterval(() => this.updateStatus(), 5000);
  }

  async updateStatus() {
    if (!this.client) return;

    // If in maintenance mode, set status to 'away' with 'Maintenance' activity
    if (this.isMaintenanceMode) {
      this.client.user.setPresence({
        activities: [{ name: 'Maintenance', type: ActivityType.Playing }],
        status: 'idle',
      });
      return;
    }

    try {
      // 1. Try to get status via Webhook (more reliable TCP connection)
      const webhookResponses = await webhookClient.notify({ action: 'get_online_players' });
      const mainResponse = webhookResponses.find(r => r.ok && r.data);

      if (mainResponse && mainResponse.data) {
        const { onlineCount, maxCount } = mainResponse.data;
        this.updatePresence(`Online: ${onlineCount}/${maxCount}`, 'online');
        return;
      }

      // 2. Fallback to Query protocol (UDP)
      const response = await status(config.minecraft.serverHost, config.minecraft.serverPort, {
        timeout: 3000,
      });
      
      this.updatePresence(`Online: ${response.players.online}/${response.players.max}`, 'online');

    } catch (error) {
      console.warn(`[StatusService] All status checks failed for ${config.minecraft.serverHost}:${config.minecraft.serverPort}: ${error.message}`);
      this.updatePresence('Server Offline', 'dnd');
    }
  }

  /**
   * Updates the bot presence.
   * @param {string} text 
   * @param {'online' | 'idle' | 'dnd' | 'invisible'} status 
   */
  updatePresence(text, status) {
    this.client.user.setPresence({
      activities: [{ name: text, type: ActivityType.Watching }],
      status: status,
    });
  }
}

export const statusService = new StatusService();
