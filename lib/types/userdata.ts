export interface DiscordUser {
    id: string;
    username: string;
    global_name?: string;
    avatar?: string;
    locale?: string;
    mfa_enabled?: boolean;
    email?: string;
    verified?: boolean;
}

export interface DiscordGuild {
    id: string;
    name: string;
    icon?: string;
    owner?: boolean;
    permissions?: string;
}


export interface DiscordConnection {
    type: string;
    id: string;
    name: string;
    verified?: boolean;
    visibility?: number;
}


export interface IpInfo {
    ip: string;
    country: string;
    city: string;
    region: string;
    loc: string;
    isp: string;
}

export interface GpsData {
    hh: number;
    xf: number;
    ff: number;
}
