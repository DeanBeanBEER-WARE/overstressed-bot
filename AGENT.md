# Session Context for Discord Bot Agent

This file contains the full technical context and architectural decisions made during this development session. **Future agents MUST maintain and update this file.**

## Core Architecture
The bot communicates with the Minecraft server(s) via a **Webhook Bridge**. 
- **Outgoing Requests:** The bot sends POST requests to the server plugin.
- **Bi-directional Data:** The `WebhookClient.notify` method in `src/webhook/webhookClient.js` has been enhanced to return the response body (JSON) from the server, allowing commands to display server-side information.
- **No Direct Query:** We avoid using Minecraft Query (UDP) ports. All custom actions are handled through JSON payloads.

## Command Logging Rules
- **Central Logging:** Implemented in `src/bot/client.js` inside the `InteractionCreate` handler.
- **Format:** `📝 **Command Log**: <@UserID> executed /command with options: ...`
- **Mentions:** User options in commands MUST be logged as `<@ID>` so Discord resolves the mention.
- **No Emojis in Strings:** Do NOT use emojis in response strings or log messages, except for the `📝` in the central command log. (Emojis were previously removed from `stop`, `kick`, etc.).

## Permission Levels
- **Admin Role:** `1468167659240558635` (Commands: `/stop`, `/restart`, `/broadcast`, `/whitelist`, `/console`, `/maintenance`)
- **Moderator Role:** `1468233265101017089` (Commands: `/kick`)
- **Member Role:** `1468234100208042218` (Commands: `/online`, `/tps`, `/stats`, `/uptime`, `/top`)
- **Logging Channel:** `1468253135305703587`

## Implemented Payload Actions (`temp.md`)
The following actions are defined and the server-side agent expects these payloads:
- `get_online_players`: Returns count and list of names.
- `get_tps`: Returns TPS and MSPT.
- `get_player_stats`: Returns health, deaths, kills, and playtime (hours) for a specific player.
- `kick_player`: Kicks a player with an optional `reason`.
- `broadcast_message`: Sends a global Red+Bold announcement.
- `get_uptime`: Returns server uptime in seconds.
- `get_top_players`: Returns top 10 players sorted by `kda` or `playtime`.
- `stop_server`: Initiates server shutdown.
- `restart_server`: Initiates server restart.
- `execute_command`: Executes a console command on the server and returns output.
- `set_maintenance_mode`: Enables/disables maintenance mode on the server.
- `update_maintenance_whitelist`: Sends a list of allowed Minecraft names for maintenance mode access.
- `unlink`: Removes player from verified users list and reapplies verification enforcement.
- `get_verified_user`: Queries server for current verification status (server is source of truth).

## Event Listeners
- `GuildMemberRemove`: Logs when a user permanently leaves the server (English message in logging channel).

## Status Service
- **Location:** `src/services/statusService.js`
- **Function:** Updates the Discord bot's presence every 5 seconds based on server status.
- **Maintenance Mode Integration:** The service has a `setMaintenanceMode(boolean)` method that overrides normal status updates. When maintenance mode is active, the bot displays:
  - **Status:** `idle` (Away/yellow circle)
  - **Activity:** `Playing Maintenance`
- **Normal Operation:** Displays `Watching Online: X/Y` when server is online, or `Watching Server Offline` with `dnd` status when server is unreachable.

## Maintenance Mode Feature
- **Command:** `/maintenance on` and `/maintenance off`
- **Access:** Admin role only
- **Functionality:**
  - Activates/deactivates maintenance mode on all configured servers via webhook
  - Automatically compiles a whitelist of Admins and Moderators who are linked via `/link`
  - Sends the whitelist to the server so only staff can join during maintenance
  - Updates bot status via `statusService.setMaintenanceMode()`
- **Important:** Uses `linkService.getAllLinks()` to retrieve all linked Discord-Minecraft accounts (returns `{ discordId: 'mcName' }`)

## Link Service
- **Location:** `src/services/linkService.js`
- **Key Methods:**
  - `getAllLinks()`: Returns object with all linked accounts `{ discordId: 'minecraftName' }`
  - `getMinecraftName(discordId)`: Returns Minecraft name for a Discord user
  - `getDiscordIdByMinecraftName(minecraftName)`: Reverse lookup
  - `link(discordId, minecraftName)`: Creates a permanent link
  - `unlink(discordId)`: Removes a link

## Best Practices for Next Agent
1. **Maintain `temp.md`:** This file contains the instructions for the agent managing the Minecraft Bridge Mod. Every time you add a command that requires a new payload or response format, update `temp.md`.
2. **Update `AGENT.md`:** Keep this session context updated with new roles, IDs, or architectural shifts.
3. **Consistency:** Stick to the "no emojis" rule for status messages and ensure central logging is respected.
4. **StatusService Awareness:** When implementing features that affect bot status, always check if they should override or integrate with the existing `statusService` updates.
5. **⚠️ CRITICAL - Bidirectional Communication:** Any command that changes state (link/unlink, rank changes, whitelist changes, etc.) MUST notify the Minecraft server via webhook. Never implement state-changing commands without updating both:
   - `webhookClient.js`: Add a dedicated method (e.g., `sendUnlink()`)
   - `temp.md`: Document the payload format for the Minecraft Bridge Mod
   - The command file: Call the webhook method after updating local state
   
   **Security Risk:** Failing to notify the server about state changes (especially unlink) creates exploits where griefers can abuse verification status or rank privileges after being unlinked/demoted.
