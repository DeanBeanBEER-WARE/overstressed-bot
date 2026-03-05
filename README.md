# Discord Rank Management Bot

A clean, production-ready Discord bot to manage Discord roles as ranks and notify a Minecraft NeoForge server via HTTP webhooks.

## Setup Instructions

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Configure Environment:**
    - The `.env` file has been created from `.env.example`.
    - Fill in your `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID`, `WEBHOOK_URL`, and `WEBHOOK_SECRET`.
    - Optionally set `ADMIN_ROLE_ID`.

3.  **Configure Ranks:**
    - Open `src/config/ranks.js`.
    - Replace `YOUR_ROLE_ID_HERE` with the actual Discord role ID for the `test` rank.
    - You can add more ranks here in the future.

4.  **Deploy Slash Commands:**
    ```bash
    npm run deploy-commands
    ```

5.  **Start the Bot:**
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
