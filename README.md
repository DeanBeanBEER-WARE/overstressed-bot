# Discord Rank Management Bot

A clean, production-ready Discord bot to manage Discord roles as ranks and notify a Minecraft NeoForge server via HTTP webhooks.

## Setup Instructions

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Configure Environment Variables:**
    Create a `.env` file with the following:
    ```env
    DISCORD_TOKEN='your_bot_token'
    DISCORD_CLIENT_ID='your_client_id'
    DISCORD_GUILD_ID='your_guild_id'
    ADMIN_ROLE_ID='your_admin_role_id'
    MEMBER_ROLE_ID='your_member_role_id'
    CHAT_CHANNEL_ID='your_chat_channel_id'
    DISCORD_WEBHOOK_URL='your_discord_webhook_url'
    MINECRAFT_SERVER_HOST='your_server_host'
    MINECRAFT_SERVER_PORT='your_server_port'
    WEBHOOK_SECRET='your_webhook_secret'
    ```

3.  **Configure Webhooks:**
    - Copy `webhooks.json.example` to `webhooks.json`
    - Edit `webhooks.json` to add your Minecraft server webhook URLs:
    ```json
    [
      {
        "name": "Minecraft Server Main",
        "url": "http://your-server:port/webhook"
      }
    ]
    ```
    - The webhook secret is stored securely in `.env` as `WEBHOOK_SECRET`

4.  **Configure Ranks:**
    - Edit `ranks.json` to match your Discord role structure
    - Each rank maps to a Discord role ID and a Minecraft LuckPerms group

5.  **Deploy Slash Commands:**
    ```bash
    npm run deploy-commands
    ```

6.  **Start the Bot:**
    ```bash
    npm start
    ```

## Usage

- `/rank add user:@TargetUser rank:test` - Adds the "test" role to the user and triggers the webhook.
- `/rank remove user:@TargetUser rank:test` - Removes the "test" role from the user and triggers the webhook.

**Permissions:** Only users with `Manage Roles` permission or the configured `ADMIN_ROLE_ID` can use these commands.

## Webhook Documentation (for Minecraft Plugin)

The bot sends a `POST` request to `WEBHOOK_URL` whenever a rank is added or removed.

### Headers
- `Content-Type: application/json`
- `X-Auth-Token: <WEBHOOK_SECRET>`

### Payload
```json
{
  "action": "add" | "remove",
  "rank": "test",
  "discordUserId": "123456789012345678",
  "discordUsername": "SomeUser#1234"
}
```

### Minecraft Side Logic
The Minecraft plugin should listen for these requests and use LuckPerms to sync the ranks:
- `add` action: `/lp user <user> parent set <rank>`
- `remove` action: `/lp user <user> parent set default`
