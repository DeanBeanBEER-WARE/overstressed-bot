import { SlashCommandBuilder } from 'discord.js';
import { webhookClient } from '../webhook/webhookClient.js';
import { ranks } from '../config/ranks.js';
import { config } from '../config/config.js';

export const command = {
  data: new SlashCommandBuilder()
    .setName('sync_all_ranks')
    .setDescription('Fetches all verified users and resyncs their highest rank (Admin only).'),

  async execute(interaction) {
    // 1. Initial Permission Check (Double safety, though native permission handles this usually)
    const hasAdminRole = interaction.member.roles.cache.has(config.discord.adminRoleId);
    if (!hasAdminRole && !interaction.member.permissions.has('Administrator')) {
      return interaction.reply({
        content: 'You do not have permission to use this command. Admin role is required.',
        ephemeral: true,
      });
    }

    // 2. Acknowledge the interaction immediately since this process might take some time
    await interaction.deferReply({ ephemeral: true });

    try {
      // 3. Request all verified users from the Minecraft server
      const responses = await webhookClient.getAllVerifiedUsers();
      const mainResponse = responses.find(r => r.ok && r.data && Array.isArray(r.data.users));

      if (!mainResponse) {
        return interaction.editReply({
          content: 'Failed to retrieve verified users from the Minecraft server. Check server status and logs.',
        });
      }

      const verifiedUsers = mainResponse.data.users;
      
      if (verifiedUsers.length === 0) {
        return interaction.editReply({
          content: 'No verified users found on the Minecraft server to sync.',
        });
      }

      let syncCount = 0;
      let failedCount = 0;
      const guild = interaction.guild;

      // 4. Iterate over all returned users
      for (const user of verifiedUsers) {
        const { minecraftName, discordId } = user;

        if (!minecraftName || !discordId) {
          console.warn(`[SyncAllRanks] Skipping invalid user entry: ${JSON.stringify(user)}`);
          failedCount++;
          continue;
        }

        try {
          // Fetch the member from the guild and force fetch their roles
          const member = await guild.members.fetch({ user: discordId, force: true }).catch(() => null);

          if (!member) {
            console.warn(`[SyncAllRanks] Member ${discordId} not found in guild. Cannot sync rank for ${minecraftName}.`);
            failedCount++;
            continue;
          }

          // Ensure roles are cached (sometimes fetch doesn't fully populate the cache if partials are used)
          const memberRoles = member.roles.cache;

          // 5. Determine the highest configured Minecraft role for this member
          // The ranks.json is ordered by priority (highest first)
          let highestRankKey = null;

          for (const [key, rankData] of Object.entries(ranks)) {
            // Skip empty role IDs or "default" (default is usually handled by luckperms natively)
            if (!rankData.roleId) continue;
            
            // If the member has this role, it's their highest rank (because of the order in ranks.json)
            if (memberRoles.has(rankData.roleId)) {
              highestRankKey = key;
              break;
            }
          }

          if (highestRankKey) {
            // 6. Send the "add" rank payload to the Minecraft server
            await webhookClient.notify({
              action: 'add',
              rank: highestRankKey,
              discordId: discordId,
              minecraftName: minecraftName,
            });
            syncCount++;
          } else {
             // Optional: If they have no role, we could potentially send a 'remove' or 'default' if needed,
             // but usually 'default' is the fallback. For now, we only sync active elevated ranks.
             console.log(`[SyncAllRanks] Member ${discordId} (${minecraftName}) has no special configured rank.`);
          }

        } catch (memberError) {
          console.error(`[SyncAllRanks] Error processing member ${discordId} (${minecraftName}):`, memberError);
          failedCount++;
        }
      }

      // 7. Final summary reply
      return interaction.editReply({
        content: `**Sync Complete!**\nSuccessfully synced ranks for **${syncCount}** users.\nFailed to sync **${failedCount}** users (e.g., no longer in Discord).`,
      });

    } catch (error) {
      console.error('[SyncAllRanks] Error executing command:', error);
      return interaction.editReply({
        content: 'An error occurred while attempting to sync all ranks. Please check the console logs for details.',
      });
    }
  },
};
