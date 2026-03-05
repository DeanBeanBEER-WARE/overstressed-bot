import { status } from 'minecraft-server-util';
import { ActivityType } from 'discord.js';
import { config } from '../config/config.js';

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
      const response = await status(config.minecraft.serverHost, config.minecraft.serverPort);
      
      const statusText = `Online: ${response.players.online}/${response.players.max}`;
      
      this.client.user.setPresence({
        activities: [{ name: statusText, type: ActivityType.Watching }],
        status: 'online',
      });

    } catch (error) {
      
      this.client.user.setPresence({
        activities: [{ name: 'Server Offline', type: ActivityType.Watching }],
        status: 'dnd',
      });
    }
  }
}

export const statusService = new StatusService();
