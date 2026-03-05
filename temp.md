# Agent Prompts for Minecraft Bridge Mod

## /online Command
Please implement a handler for the following incoming JSON payload via the webhook bridge:

**Incoming Request Payload:**
```json
{ 
  "action": "get_online_players" 
}
```

**Required Response Behavior:**
Your bridge mod must respond to this POST request with a `200 OK` status and a JSON body containing the current server status.

**Expected Response JSON Format:**
```json
{
  "onlineCount": 5,
  "maxCount": 20,
  "players": ["Alice", "Bob", "Charlie", "Dave", "Eve"]
}
```

**Technical Note:** Ensure the `Content-Type` header of your response is set to `application/json` so the bot can correctly parse the data. The response must be sent directly in the body of the response to the bot's POST request.

---

## /tps Command
Please implement a handler for the following incoming JSON payload via the webhook bridge:

**Incoming Request Payload:**
```json
{ 
  "action": "get_tps" 
}
```

**Required Response Behavior:**
Your bridge mod must respond to this POST request with a `200 OK` status and a JSON body containing the server's current Ticks Per Second (TPS) and Tick Time (MSPT).

**Expected Response JSON Format:**
```json
{
  "tps": 20.0,
  "mspt": 15.2
}
```

**Technical Note:** Ensure the `Content-Type` header of your response is set to `application/json`. The response must be sent directly in the body of the response to the bot's POST request.

---

## /stats Command
Please implement a handler for the following incoming JSON payload via the webhook bridge:

**Incoming Request Payload:**
```json
{ 
  "action": "get_player_stats",
  "minecraftName": "string"
}
```

**Required Response Behavior:**
Your bridge mod must respond to this POST request with a `200 OK` status and a JSON body containing the requested player's statistics.

**Expected Response JSON Format:**
```json
{
  "minecraftName": "string",
  "health": 20.0,
  "deaths": 5,
  "kills": 42,
  "playtime": 12.5
}
```

**Technical Note:** Ensure the `Content-Type` header of your response is set to `application/json`. The response must be sent directly in the body of the response to the bot's POST request. Statistics should reflect the current state of the player on the server.

---

## /kick Command
Please implement a handler for the following incoming JSON payload via the webhook bridge:

**Incoming Request Payload:**
```json
{ 
  "action": "kick_player",
  "minecraftName": "string",
  "reason": "string (optional)"
}
```

**Required Action:**
Your bridge mod should immediately kick the specified player from the Minecraft server.

**Expected Response JSON Format:**
```json
{
  "success": true,
  "message": "Player [Name] has been kicked."
}
```

**Technical Note:** Ensure the `Content-Type` header of your response is set to `application/json`. The response must be sent directly in the body of the response to the bot's POST request. If the player is not found or cannot be kicked, return `success: false` with an appropriate message.

---

## /broadcast Command
Please implement a handler for the following incoming JSON payload via the webhook bridge:

**Incoming Request Payload:**
```json
{ 
  "action": "broadcast_message",
  "message": "string",
  "sender": "string"
}
```

**Required Action:**
Your bridge mod should display this message as a global announcement on the Minecraft server. The message must be formatted in **Red** and **Bold**.

**Expected Response JSON Format:**
```json
{
  "success": true
}
```

**Technical Note:** Ensure the `Content-Type` header of your response is set to `application/json`. The response must be sent directly in the body of the response to the bot's POST request.

---

## /uptime Command
Please implement a handler for the following incoming JSON payload via the webhook bridge:

**Incoming Request Payload:**
```json
{ 
  "action": "get_uptime" 
}
```

**Required Response Behavior:**
Your bridge mod must respond with a `200 OK` status and a JSON body containing the server's uptime in seconds.

**Expected Response JSON Format:**
```json
{
  "uptimeSeconds": 3600
}
```

**Technical Note:** Ensure the `Content-Type` header of your response is set to `application/json`. The response must be sent directly in the body of the response to the bot's POST request.

---

## /top Command
Please implement a handler for the following incoming JSON payload via the webhook bridge:

**Incoming Request Payload:**
```json
{ 
  "action": "get_top_players",
  "sortBy": "kda" | "playtime"
}
```

**Required Response Behavior:**
Your bridge mod must respond with a `200 OK` status and a JSON body containing an array of the top 10 players based on the requested metric.

**Expected Response JSON Format:**
```json
{
  "players": [
    { "minecraftName": "Player1", "kda": 2.5, "playtime": 120.5 },
    { "minecraftName": "Player2", "kda": 1.8, "playtime": 95.0 }
  ]
}
```

**Technical Note:** Ensure the `Content-Type` header of your response is set to `application/json`. The response must be sent directly in the body of the response to the bot's POST request. Players should be sorted in descending order by the requested metric.

---

## /stop Command
Please implement a handler for the following incoming JSON payload via the webhook bridge:

**Incoming Request Payload:**
```json
{ 
  "action": "stop_server" 
}
```

**Required Action:**
Your bridge mod should immediately initiate a graceful shutdown of the Minecraft server.

**Expected Response JSON Format:**
```json
{
  "success": true,
  "message": "Server shutdown initiated."
}
```

**Technical Note:** Ensure the `Content-Type` header of your response is set to `application/json`. The response must be sent directly in the body of the response to the bot's POST request.

---

## /restart Command
Please implement a handler for the following incoming JSON payload via the webhook bridge:

**Incoming Request Payload:**
```json
{ 
  "action": "restart_server" 
}
```

**Required Action:**
Your bridge mod should immediately initiate a restart of the Minecraft server.

**Expected Response JSON Format:**
```json
{
  "success": true,
  "message": "Server restart initiated."
}
```

**Technical Note:** Ensure the `Content-Type` header of your response is set to `application/json`. The response must be sent directly in the body of the response to the bot's POST request.

---

## /console Command
Please implement a handler for the following incoming JSON payload via the webhook bridge:

**Incoming Request Payload:**
```json
{ 
  "action": "execute_command",
  "command": "say hello"
}
```

**Required Action:**
Your bridge mod should execute the provided command string on the server console as if typed by an operator or console itself.

**Expected Response JSON Format:**
```json
{
  "output": "Server: hello"
}
```

**Technical Note:** Ensure the `Content-Type` header of your response is set to `application/json`. The response must be sent directly in the body of the response to the bot's POST request. If the command produces output, include it in the `output` field.

---

## /maintenance Command
Please implement handlers for the following incoming JSON payloads via the webhook bridge:

### `set_maintenance_mode`
**Incoming Request Payload (Bot -> Mod):**
```json
{
  "action": "set_maintenance_mode",
  "mode": true
}
```

**Required Action:**
Your bridge mod must store this maintenance `mode` state. If `mode` is `true`, the server is in maintenance. If `mode` is `false`, maintenance is off.

**Expected Response JSON Format (Mod -> Bot):**
```json
{
  "success": true,
  "message": "Maintenance mode set to [on/off]."
}
```

**Technical Note:** Ensure the `Content-Type` header of your response is set to `application/json`.

---

## /mute Command
Please implement a handler for the following incoming JSON payload via the webhook bridge:

**Incoming Request Payload:**
```json
{ 
  "action": "mute_player",
  "minecraftName": "string",
  "duration": null | number,
  "reason": "string (optional)"
}
```

**Required Action:**
Your bridge mod should immediately mute the specified player on the Minecraft server.

**Duration Behavior:**
- If `duration` is `null` → Apply a **permanent mute** (no expiry)
- If `duration` is a number → Apply a **temporary mute** for the specified number of **minutes**

**Expected Response JSON Format:**
```json
{
  "success": true,
  "message": "Player [Name] has been muted."
}
```

**Technical Note:** Ensure the `Content-Type` header of your response is set to `application/json`. The response must be sent directly in the body of the response to the bot's POST request. If the player is not found or cannot be muted, return `success: false` with an appropriate message.

---

## /unmute Command
Please implement a handler for the following incoming JSON payload via the webhook bridge:

**Incoming Request Payload:**
```json
{ 
  "action": "unmute_player",
  "minecraftName": "string"
}
```

**Required Action:**
Your bridge mod should immediately unmute the specified player on the Minecraft server, removing any active mute (permanent or temporary).

**Expected Response JSON Format:**
```json
{
  "success": true,
  "message": "Player [Name] has been unmuted."
}
```

**Technical Note:** Ensure the `Content-Type` header of your response is set to `application/json`. The response must be sent directly in the body of the response to the bot's POST request. If the player is not found or is not currently muted, return `success: false` with an appropriate message.

---

## Player Verification Success Notification

**Important:** When a player successfully verifies their account using `/verify <code>` in Minecraft, you must send a notification to Discord's logging channel instead of broadcasting in Minecraft chat.

**Required Action:**
1. **DO NOT** send the verification success message in Minecraft chat
2. **DO** send a Discord webhook POST request to the logging webhook URL

**Discord Webhook URL:** 
This will be provided in your mod's config file as `discordLoggingWebhookUrl`.

**Webhook POST Request Format:**
```json
{
  "content": "✅ **Player Verification**: Player `MinecraftName` has successfully verified their account (Discord ID: `123456789`)"
}
```

**Example cURL:**
```bash
curl -X POST "https://discord.com/api/webhooks/1468253135305703587/YOUR_WEBHOOK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"✅ **Player Verification**: Player `PlayerName` has successfully verified their account (Discord ID: `123456789`)"}'
```

**Technical Note:** This keeps verification logs in Discord's logging channel for moderation purposes, while keeping Minecraft chat clean from system messages.

---

## /unlink Command
Please implement a handler for the following incoming JSON payload via the webhook bridge:

**Incoming Request Payload:**
```json
{
  "action": "unlink",
  "discordId": "123456789",
  "minecraftName": "PlayerName"
}
```

**Required Action:**
Your bridge mod must:
1. Remove the player's entry from `verified_users.json` (or your verification storage)
2. If the player is currently online on the server, immediately reapply verification enforcement (apply debuffs/restrictions as if they are not verified)
3. The player should be treated as unverified until they link and verify again

**Expected Response JSON Format:**
```json
{
  "success": true,
  "message": "Player unlinked successfully."
}
```

**Technical Note:** Ensure the `Content-Type` header of your response is set to `application/json`. This is critical for maintaining security - unlinked players must lose their verification status immediately to prevent abuse after griefing or rule violations.

---

## /resync Command (Server-Authoritative Sync)
Please implement a handler for the following incoming JSON payload via the webhook bridge:

**Incoming Request Payload:**
```json
{
  "action": "get_verified_user",
  "minecraftName": "PlayerName"
}
```

**Required Response Behavior:**
Your bridge mod must query its `verified_users.json` (or equivalent verification storage) and return the current verification status for the specified Minecraft username.

**Expected Response JSON Format:**

If player IS verified:
```json
{
  "minecraftName": "PlayerName",
  "discordId": "123456789",
  "isVerified": true
}
```

If player is NOT verified:
```json
{
  "minecraftName": "PlayerName",
  "discordId": null,
  "isVerified": false
}
```

**Technical Note:** This endpoint makes the Minecraft server the **source of truth** for link/verification status. Discord will synchronize its `links.json` database to match the server's response, fixing any desync issues. This is critical for resolving stuck states where Discord and server databases disagree about verification status.

### `update_maintenance_whitelist`
**Incoming Request Payload (Bot -> Mod):**
```json
{
  "action": "update_maintenance_whitelist",
  "allowedPlayers": ["Player1", "Player2", "Player3"]
}
```

**Required Action:**
Your bridge mod must store this list of `allowedPlayers` (Minecraft names). When the server is in maintenance mode, only players whose Minecraft name is in this list should be allowed to log in.

**Login Check Logic (for your mod):**
When a player attempts to log in:
1.  Check the current `maintenance_mode` state.
2.  If `maintenance_mode` is `true`:
    a.  Check if the attempting player's Minecraft name is present in the stored `allowedPlayers` list.
    b.  If the player's name is in the list, allow login.
    c.  If the player's name is NOT in the list, deny login with a message (e.g., "Server is in maintenance mode. Only staff can join.").

**Expected Response JSON Format (Mod -> Bot):**
```json
{
  "success": true,
  "message": "Maintenance whitelist updated."
}
```

**Technical Note:** Ensure the `Content-Type` header of your response is set to `application/json`.
