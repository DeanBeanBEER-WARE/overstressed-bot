import 'dotenv/config';

/**
 * Application configuration module.
 * Centralizes access to environment variables.
 */
export const config = {
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    guildId: process.env.DISCORD_GUILD_ID,
    adminRoleId: process.env.ADMIN_ROLE_ID,
    memberRoleId: process.env.MEMBER_ROLE_ID,
    chatChannelId: process.env.CHAT_CHANNEL_ID,
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
    loggingChannelId: '1468253135305703587',
    moderatorRoleId: '1468233265101017089',
    adminRoleId: '1468167659240558635',
  },
  minecraft: {
    serverHost: process.env.MINECRAFT_SERVER_HOST,
    serverPort: parseInt(process.env.MINECRAFT_SERVER_PORT, 10),
  },
  server: {
    port: process.env.HTTP_PORT || 8080,
  },
  webhook: {
    // Deprecated: Now using webhooks.json for multiple destinations
    url: process.env.WEBHOOK_URL,
    secret: process.env.WEBHOOK_SECRET,
  },
};

// Validate critical configuration
const missingVars = [];
if (!config.discord.token) missingVars.push('DISCORD_TOKEN');
if (!config.discord.clientId) missingVars.push('DISCORD_CLIENT_ID');
if (!config.discord.guildId) missingVars.push('DISCORD_GUILD_ID');

if (missingVars.length > 0) {
  console.error(`Error: Missing environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}
