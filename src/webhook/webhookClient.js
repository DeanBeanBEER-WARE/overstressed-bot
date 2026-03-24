import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from '../config/config.js';
import { Pool } from 'undici';

/**
 * Manages a single Webhook endpoint with connection pooling, strict concurrency, 
 * timeouts, and exponential backoff.
 */
class WebhookEndpoint {
  constructor(name, fullUrl) {
    this.name = name;
    this.fullUrl = fullUrl;
    
    const parsedUrl = new URL(fullUrl);
    this.origin = parsedUrl.origin;
    this.path = parsedUrl.pathname + parsedUrl.search;
    
    /** 
     * Use a small HTTP connection pool with persistent connections.
     * Limit to 4 TCP connections (slots) with 2s connect timeout and 5s read timeout.
     */
    this.pool = new Pool(this.origin, {
      connections: 4,
      connectTimeout: 2000,
      headersTimeout: 5000,
      bodyTimeout: 5000,
      keepAliveTimeout: 30000,
      keepAliveMaxTimeout: 60000,
    });

    this.activeRequests = 0;
    this.queue = [];
    
    /** 
     * Metrics for tracking connection and request health.
     */
    this.metrics = {
      successfulRequests: 0,
      failedRequests: 0,
      timeouts: 0,
      connectionErrors: 0,
    };
    
    this.consecutiveErrors = 0;
  }

  /**
   * Enqueues a new request. If 4 slots are busy, it waits in the queue.
   */
  async execute(data) {
    return new Promise((resolve, reject) => {
      this.queue.push({ data, resolve, reject, enqueueTime: Date.now() });
      this._processQueue();
    });
  }

  /**
   * Processes the internal queue, executing requests when slots are available.
   * Limits the number of concurrent requests to this server to a maximum of 4.
   */
  async _processQueue() {
    if (this.activeRequests >= 4 || this.queue.length === 0) {
      return;
    }
    
    const task = this.queue.shift();
    this.activeRequests++;
    
    /** 
     * General robustness: Slow down on frequent errors (Throttling)
     * Adds an artificial delay between 1.5s to 3s based on consecutive errors.
     */
    if (this.consecutiveErrors >= 3) {
      const delayMs = Math.min(this.consecutiveErrors * 500, 3000);
      await new Promise(r => setTimeout(r, delayMs));
    }
    
    try {
      const result = await this._retryLogic(task.data);
      this.consecutiveErrors = 0;
      this.metrics.successfulRequests++;
      task.resolve(result);
    } catch (error) {
      this.consecutiveErrors++;
      this.metrics.failedRequests++;
      
      const isTimeout = error.code === 'UND_ERR_HEADERS_TIMEOUT' || error.code === 'UND_ERR_BODY_TIMEOUT' || error.code === 'UND_ERR_CONNECT_TIMEOUT';
      const isConnError = error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' || error.code === 'UND_ERR_SOCKET';
      
      if (isTimeout) this.metrics.timeouts++;
      if (isConnError) this.metrics.connectionErrors++;
      
      /**
       * Resolve with false ok instead of throwing to prevent unhandled rejections upstream.
       */
      task.resolve({ name: this.name, ok: false, error: error.message || error.code });
    } finally {
      this.activeRequests--;
      this._processQueue();
    }
  }

  /**
   * Executes a single request with a robust retry strategy and exponential backoff.
   * @param {Object} data - The payload to send.
   */
  async _retryLogic(data) {
    let attempts = 0;
    const maxAttempts = 5;
    
    /**
     * Exponential backoff delays in milliseconds for failed requests.
     */
    const delays = [200, 500, 1000, 2000, 5000];
    
    while (attempts < maxAttempts) {
      attempts++;
      const startTime = Date.now();
      
      try {
        /**
         * Send fully HTTP-compliant request with required headers.
         */
        const { statusCode, headers, body } = await this.pool.request({
          path: this.path,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Connection': 'keep-alive',
            'X-Auth-Token': config.webhook.secret,
          },
          body: JSON.stringify(data)
        });
        
        /**
         * Read each HTTP response completely to allow connection reuse.
         */
        let responseData = '';
        for await (const chunk of body) {
          responseData += chunk.toString();
        }
        
        const duration = Date.now() - startTime;
        
        /**
         * Error logging and metrics output for successful requests.
         */
        console.log(`[Webhook][${this.name}] 🟢 SUCCESS | Target: ${this.fullUrl} | Status: ${statusCode} | Duration: ${duration}ms | Action: ${data.action} | Active/Queue: ${this.activeRequests}/${this.queue.length}`);
        
        if (statusCode >= 200 && statusCode < 300) {
           let parsed = {};
           if (headers['content-type'] && headers['content-type'].includes('application/json')) {
             try { parsed = JSON.parse(responseData); } catch(e){}
           }
           return { name: this.name, ok: true, data: parsed, status: statusCode };
        } else {
           console.error(`[Webhook][${this.name}] 🟡 HTTP ERROR | Target: ${this.fullUrl} | Status: ${statusCode} | Response: ${responseData}`);
           return { name: this.name, ok: false, status: statusCode, error: responseData };
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[Webhook][${this.name}] 🔴 NETWORK ERROR | Target: ${this.fullUrl} | Type: ${error.code || error.message} | Duration: ${duration}ms | Attempt: ${attempts}/${maxAttempts}`);
        
        if (attempts >= maxAttempts) {
          console.error(`[Webhook][${this.name}] 🛑 MAX RETRIES REACHED | Target: ${this.fullUrl} | Action: ${data.action}`);
          throw error;
        }
        
        /**
         * Wait before next attempt using exponential backoff.
         */
        const delayMs = delays[attempts - 1] || 5000;
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }

  /**
   * Returns current connection pool and request metrics.
   * @returns {Object} The metrics object.
   */
  getMetrics() {
    return {
      activeConnections: this.pool.stats ? this.pool.stats.connected : 'N/A',
      pendingRequests: this.pool.stats ? this.pool.stats.pending : 'N/A',
      activeRequests: this.activeRequests,
      queuedRequests: this.queue.length,
      ...this.metrics
    };
  }
}

/**
 * Webhook client for communicating with one or more Minecraft NeoForge server plugins.
 */
export class WebhookClient {
  constructor() {
    this.webhooksPath = join(process.cwd(), 'resources', 'webhooks.json');
    this.endpoints = new Map();
  }

  /**
   * Loads the list of webhooks from webhooks.json and initializes endpoints.
   */
  loadWebhooks() {
    try {
      const data = readFileSync(this.webhooksPath, 'utf8');
      const configs = JSON.parse(data);
      
      const currentEndpoints = new Map();
      
      for (const conf of configs) {
        if (!this.endpoints.has(conf.name)) {
          this.endpoints.set(conf.name, new WebhookEndpoint(conf.name, conf.url));
        }
        currentEndpoints.set(conf.name, this.endpoints.get(conf.name));
      }
      
      // Cleanup removed endpoints
      for (const [name, endpoint] of this.endpoints.entries()) {
        if (!currentEndpoints.has(name)) {
          endpoint.pool.destroy();
          this.endpoints.delete(name);
        }
      }
      
      return Array.from(this.endpoints.values());
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
    const endpoints = this.loadWebhooks();

    if (endpoints.length === 0) {
      console.warn('[WebhookClient] No webhooks configured in webhooks.json');
      return [];
    }

    const requests = endpoints.map(endpoint => endpoint.execute(data));

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

  /**
   * Queries the Minecraft server for all verified users.
   * @returns {Promise<Array>} Array of webhook responses containing the list of verified users.
   */
  async getAllVerifiedUsers() {
    return await this.notify({
      action: 'get_all_verified_users'
    });
  }
}

export const webhookClient = new WebhookClient();