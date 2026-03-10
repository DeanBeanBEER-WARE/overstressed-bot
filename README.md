# Overstressed Discord Bot

A comprehensive Discord bot for Minecraft NeoForge server management with full Discord-Minecraft integration, account linking, rank synchronization, and server administration capabilities.

## Features

-  **Account Linking & Verification** - Link Discord accounts to Minecraft usernames with verification codes
-  **Automatic Rank Synchronization** - Discord roles automatically sync to Minecraft LuckPerms groups
-  **Server Management** - Start, stop, restart, and manage server maintenance mode
-  **Real-time Statistics** - TPS monitoring, player statistics, leaderboards, and server status
-  **Chat Bridge** - Bi-directional Discord ↔ Minecraft chat synchronization
-  **Player Management** - Kick players, manage whitelist, and verify accounts
-  **Channel Management** - Advanced message purging with support for old messages (>14 days)
-  **Console Access** - Execute Minecraft console commands directly from Discord
-  **Automatic Scanning** - Periodic role scanning and rank synchronization

## Commands

### Account Management
| Command | Description | Permissions |
|---------|-------------|-------------|
| `/link <minecraftname>` | Link your Discord account to Minecraft | Member role |
| `/unlink` | Remove account link and reset verification | User |
| `/resync` | Force resync ranks between Discord and Minecraft | User |

### Rank Management
| Command | Description | Permissions |
|---------|-------------|-------------|
| `/rank add <user> <rank>` | Add a rank role to a user | Admin |
| `/rank remove <user> <rank>` | Remove a rank role from a user | Admin |

### Server Information
| Command | Description | Permissions |
|---------|-------------|-------------|
| `/online` | Show currently online players | Everyone |
| `/tps` | Display server TPS and MSPT | Everyone |
| `/stats <minecraftname>` | Show player statistics | Everyone |
| `/top <kda\|playtime>` | Display top 10 players leaderboard | Everyone |
| `/uptime` | Show server uptime | Everyone |

### Server Management
| Command | Description | Permissions |
|---------|-------------|-------------|
| `/stop` | Gracefully shutdown the server | Admin |
| `/restart` | Restart the Minecraft server | Admin |
| `/maintenance <on\|off>` | Toggle maintenance mode | Admin |
| `/console <command>` | Execute a server console command | Admin |

### Player Management
| Command | Description | Permissions |
|---------|-------------|-------------|
| `/kick <minecraftname> [reason]` | Kick a player from the server | Moderator |
| `/mute <player\|user> [duration] [reason]` | Mute a player (duration in minutes, empty = permanent) | Moderator |
| `/unmute <player\|user>` | Unmute a player | Moderator |
| `/whitelist <add\|remove> <minecraftname>` | Manage server whitelist | Admin |
| `/broadcast <message>` | Send announcement to all players | Admin |

### Channel Management
| Command | Description | Permissions |
|---------|-------------|-------------|
| `/purge [amount]` | Delete messages (default: all) | Admin |

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:

```env
# Discord Configuration
DISCORD_TOKEN='your_bot_token'
DISCORD_CLIENT_ID='your_client_id'
DISCORD_GUILD_ID='your_guild_id'

# Role IDs
ADMIN_ROLE_ID='your_admin_role_id'
MEMBER_ROLE_ID='your_member_role_id'

# Channel IDs
CHAT_CHANNEL_ID='your_chat_channel_id'

# Discord Webhooks
DISCORD_WEBHOOK_URL='your_discord_webhook_url'

# Minecraft Server
MINECRAFT_SERVER_HOST='your_server_host'
MINECRAFT_SERVER_PORT='25565'

# Security
WEBHOOK_SECRET='your_secure_random_secret'
```

### 3. Configure Webhooks
Copy `webhooks.json.example` to `webhooks.json` and configure your Minecraft server webhook endpoints:

```json
[
  {
    "name": "Minecraft Server Main",
    "url": "http://your-server-host:port/webhook"
  }
]
```

**Security Note:** The webhook secret is stored in `.env` as `WEBHOOK_SECRET`. All requests to Minecraft webhooks include this secret in the `X-Auth-Token` header.

### 4. Configure Ranks
Edit `ranks.json` to define your rank structure:

```json
[
  {
    "name": "vip",
    "roleId": "YOUR_DISCORD_ROLE_ID",
    "luckpermsGroup": "vip"
  }
]
```

Each rank maps a Discord role to a Minecraft LuckPerms group for automatic synchronization.

### 5. Deploy Commands
```bash
npm run deploy-commands
```

### 6. Start the Bot
```bash
npm start
```

## Architecture

### Services
- **linkService** - Manages Discord-Minecraft account linking and verification
- **rankService** - Handles rank synchronization between Discord and LuckPerms
- **scannerService** - Automatic periodic scanning of Discord members for rank updates
- **statusService** - Monitors Minecraft server status and updates bot presence
- **webhookClient** - Communicates with Minecraft server via HTTP webhooks

### Webhook Bridge
The bot communicates with the Minecraft server through a webhook bridge mod/plugin that must be installed server-side.

#### Outgoing Webhook Format (Discord → Minecraft)
All requests include:
- **Header:** `X-Auth-Token: <WEBHOOK_SECRET>`
- **Content-Type:** `application/json`

**Example Actions:**
```json
// Rank Update
{
  "action": "add" | "remove",
  "rank": "vip",
  "discordId": "123456789",
  "minecraftName": "PlayerName"
}

// Verification
{
  "action": "verify",
  "discordId": "123456789",
  "minecraftName": "PlayerName",
  "code": "123456"
}

// Server Management
{
  "action": "stop_server" | "restart_server" | "kick_player",
  ...
}
```

#### Expected Responses (Minecraft → Discord)
The Minecraft webhook must respond with JSON:

```json
{
  "success": true,
  "message": "Action completed"
}
```

For data queries (e.g., `/online`, `/tps`, `/stats`):
```json
{
  "onlineCount": 5,
  "players": ["Player1", "Player2"],
  "tps": 20.0,
  "mspt": 15.2
}
```

## Security Best Practices

1. **Never commit `.env` files** - They contain sensitive tokens
2. **Keep `webhooks.json` private** - Contains server infrastructure details
3. **Rotate `WEBHOOK_SECRET` regularly** - Prevents unauthorized webhook access
4. **Use HTTPS for production webhooks** - Secure data in transit
5. **Restrict admin role permissions** - Only trusted users should have admin commands

## Minecraft Server Requirements

The Minecraft server must have:
1. **NeoForge** installed
2. **LuckPerms** for permission management
3. **Webhook Bridge Mod** to receive Discord bot requests (custom implementation required)

The webhook bridge mod should handle:
- Account verification
- Rank synchronization with LuckPerms
- Player management (kick, whitelist)
- Server commands execution
- Statistics queries

## Development

### Project Structure
```
src/
├── bot/           # Discord client setup
├── commands/      # Slash command implementations
├── config/        # Configuration loaders
├── services/      # Business logic services
└── webhook/       # Webhook client
```

### Adding New Commands
1. Create command file in `src/commands/`
2. Export command with `data` (SlashCommandBuilder) and `execute` function
3. Import and add to `src/bot/client.js` commands collection
4. Import and add to `src/deploy-commands.js` for deployment
5. Run `npm run deploy-commands`

## Troubleshooting

### Bot not responding to commands
- Ensure `DISCORD_TOKEN` is valid
- Check bot has proper permissions in Discord server
- Verify commands were deployed: `npm run deploy-commands`

### Rank sync not working
- Verify `ranks.json` role IDs match Discord roles
- Check webhook connectivity to Minecraft server
- Ensure LuckPerms is installed on Minecraft server

### Webhook errors
- Confirm `WEBHOOK_SECRET` matches on both Discord bot and Minecraft mod
- Verify webhook URLs in `webhooks.json` are accessible
- Check Minecraft server webhook bridge is running

## License

ISC

## Contributing

This bot is designed for specific server infrastructure. For feature requests or bug reports, contact the server administrators.
