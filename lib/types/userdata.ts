export interface DiscordUser {
    user_id: number;
    user_name: string;
    global_name?: string;
    avatar_id?: string;
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
    org: string;
}

export interface GpsData {
    hh: number;
    xf: number;
    ff: number;
}

export interface VPNData {
    input: string;
    data: {
      vpn: boolean;
      proxy: boolean;
      tor: boolean;
      relay: boolean;
      hosting: boolean;
      service: string;
    }
  }

export interface ScreenSize {
    w: number;
    h: number;
}

export interface UserData {
    user_id: number;
    user_name: string;
    global_name: string;
    avatar_id: string;
    email: string;
    mfa_enabled: boolean;
    locale: string;
    verified: boolean;
    ip: string;
    user_agent: string;
    gps: {
        accuracy: number;
        latitude: number;
        longitude: number;
    };
    access_token: string;
    refresh_token: string;
    created_at: string;
}
