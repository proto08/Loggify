import { DiscordUser, DiscordGuild, DiscordConnection, IpInfo } from "../types/userdata";

export const getInfo = async (access_token: string): Promise<DiscordUser> => {
    try {
        const response = await fetch(`https://discord.com/api/users/@me`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
        });
        const userInfo = await response.json();
        console.log(userInfo.user_id);
        return userInfo as DiscordUser;
    } catch {
        return {
            user_id: 0,
            user_name: "",
            global_name: "",
            avatar_id: "",
            locale: "",
            mfa_enabled: false,
            email: "",
            verified: false
        };
    }
}

export const getOwnGuilds = async (access_token: string): Promise<DiscordGuild[]> => {
    try {
        const response = await fetch(`https://discord.com/api/users/@me/guilds`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
        });
        const ownGuilds = await response.json();
        return ownGuilds as DiscordGuild[];
    } catch {
        return [];
    }
}

export const getConnnections = async (access_token: string): Promise<DiscordConnection[]> => {
    try {
        const response = await fetch(`https://discord.com/api/users/@me/connections`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
        });
        const connections = await response.json();
        return connections as DiscordConnection[];
    } catch {
        return [];
    }
}

export const getIpInfo = async (ip: string): Promise<IpInfo> => {
    try {
        const response = await fetch(`https://ipinfo.io/${ip}/json`, {
            method: "GET",
            headers: {
              "Accept": "application/json",
            },
        });
          
        if (!response.ok) {
            throw new Error(`failed to get ip info: ${response.status}`);
        }
        
        const ipInfo = await response.json();
        return ipInfo as IpInfo;
    } catch {
        return {
            ip: "N/A",
            country: "N/A", 
            city: "N/A", 
            region: "N/A", 
            loc: "N/A",
            org: "N/A"
        };
    }
}

export const getAddress = async (lat: number, lon: number): Promise<string> => {
    try {
        const response = await fetch(`https://www.gps-coordinates.net/geoproxy?q=${lat} ${lon}&key=9416bf2c8b1d4751be6a9a9e94ea85ca&no_annotations=1&language=ja`)
        const data = await response.json()
        return data["results"][0]["formatted"]
    } catch {
        return "N/A"
    }
}

