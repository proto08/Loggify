import { DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, DISCORD_ROLE_ID } from "@/lib/constants";

export async function assignRole(userId: string) {
  try {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${userId}/roles/${DISCORD_ROLE_ID}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!res.ok) {
      throw new Error("Failed to assign role");
    }
  } catch (error) {
    console.log("Error in assign role:", error);
    throw error;
  }
}
