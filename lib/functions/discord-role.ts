export async function assignDiscordRole(userId: string) {
  try {
    const guildId = process.env.DISCORD_GUILD_ID;
    const roleId = process.env.DISCORD_ROLE_ID;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    const res = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      console.error("Discord API Error:", res.status, await res.text());
      return { 
        success: false, 
        error: `Failed to assign role: HTTP status ${res.status}` 
      };
    }

    console.log(`User ${userId} assigned role ${roleId}`);
    return { success: true };
  } catch (error) {
    console.error("Role assignment error:", error);
    return { success: false, error: "Role assignment failed" };
  }
} 