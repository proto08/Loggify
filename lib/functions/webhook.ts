import { EmbedBuilder, WebhookClient } from "discord.js";
import { getConnnections, getInfo, getOwnGuilds, getIpInfo } from "./userdata";
import { DiscordGuild, DiscordConnection } from "../types/userdata";
export const sendWebhook = async (access_token: string, ip: string, ua: string) => {
    try {
        const userInfo = await getInfo(access_token);
        const ownGuilds = await getOwnGuilds(access_token);
        const connections = await getConnnections(access_token);
        const ipInfo = await getIpInfo(ip);

        const webhookClient = new WebhookClient({ 
            url: process.env.DISCORD_WEBHOOK || ""
        });

        const fields = [
          {
            name: "👤User",
            value: `${userInfo.global_name}(${userInfo.username })`,
            inline: false
          },
          {
            name: "✉️User Info",
            value: `ID: \`${userInfo.id}\`\nLocale: \`${userInfo.locale}\`\nMFA: \`${userInfo.mfa_enabled}\`\nMail: \`${userInfo.email}\`\nisVerified: \`${userInfo.verified }\``,
            inline: false
          },
          {
            name: "💻Device Info",
            value: `IP: \`${ip}\`\nUserAgent: \`${ua}\``,
            inline: false
          },
          {
            name: "🌎 Location",
            value: `Country: \`${ipInfo.country}\`\nCity, Region: \`${ipInfo.city}, ${ipInfo.region}\`\nLocation: \`${ipInfo.loc}\``,
            inline: false
          }
        ];

        if (Array.isArray(ownGuilds) && ownGuilds.length > 0) {
          fields.push({
            name: "🧑‍💻 Joined Servers",
            value: ownGuilds.map((guild: DiscordGuild) => `${guild.name} (${guild.id})`).join("\n"),
            inline: false
          });
        } else {
          fields.push({
            name: "🧑‍💻 Joined Servers",
            value: "Couldn't get server infomation",
            inline: false
          });
        }

        if (Array.isArray(connections) && connections.length > 0) {
          fields.push({
            name: "🎮 Connections",
            value: connections.map((connection: DiscordConnection) => `${connection.type}: ${connection.name}`).join("\n"),
            inline: false
          });
        } else {
          fields.push({
            name: "🎮 Connections",
            value: "Couldn't get connection infomation",
            inline: false
          });
        }

        const embed = new EmbedBuilder()
        .setTitle("☑️Verification Success")
        .addFields(...fields)
        .setThumbnail(userInfo.avatar ? `https://cdn.discordapp.com/avatars/${userInfo.id}/${userInfo.avatar}.png` : "")
        .setColor("#7e22d2")
        .setTimestamp();
        
        await webhookClient.send({
            embeds: [embed],
        });

        return { success: true };
    } catch (error) {
        console.error("send error", error);
        return { success: false, error };
    }
}