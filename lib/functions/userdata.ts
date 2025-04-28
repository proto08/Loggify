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
        return userInfo as DiscordUser;
    } catch (err) {
        console.log(err);
        return {
            id: "",
            username: ""
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
    } catch (err) {
        console.log(err);
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
    } catch (err) {
        console.log(err);
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
    } catch (err) {
        console.log(err);
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