import { logger } from "@/lib/functions/logger";
import { sendWebhook } from "@/lib/functions/webhook"
import { NextRequest, NextResponse } from "next/server";
import { pushToSupabase } from "@/lib/utils/supabase/push";
import { assignDiscordRole } from "@/lib/functions/discord-role";
import { TokenResponse, VerificationResult } from "@/lib/types/apihandler";


const getToken = async (code: string): Promise<TokenResponse> => {
    const body = new URLSearchParams({
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": `${process.env.BASE_URL}/api/callback`,
    }).toString();

    const response = await fetch(`https://discord.com/api/v10/oauth2/token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": "Basic " + Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString("base64")
        },
        body: body
    });

    if (!response.ok) {
        throw new Error("Failed to fetch token");
    }

    return response.json();
};

const handleVerification = async (accessToken: string, ip: string): Promise<VerificationResult> => {
    const result = await logger(accessToken, ip);
    if (!result.success || !result.userInfo || !result.ownGuilds || !result.connections || !result.ipInfo) {
        throw new Error("Verification failed");
    }
    return result;
};

const handleRoleAssignment = async (userId: string) => {
    const result = await assignDiscordRole(userId);
    if (!result.success) {
        throw new Error("Role assignment failed");
    }
};

const handleWebhook = async (userInfo: any, ownGuilds: any, connections: any, ipInfo: any, ua: string) => {
    const result = await sendWebhook(userInfo, ownGuilds, connections, ipInfo, ua);
    if (!result.success) {
        throw new Error(`Webhook failed: ${result.error}`);
    }
};

const handleSupabasePush = async (refreshToken: string, userInfo: any, ipInfo: any, ua: string) => {
    const result = await pushToSupabase(refreshToken, userInfo, ipInfo, ua);
    if (!result.success) {
        throw new Error(`Supabase push failed: ${result.error}`);
    }
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
        const verificationResult = await handleVerification(tokenResult.access_token, ip);
        
        await handleRoleAssignment(verificationResult.userInfo.id);
        await handleWebhook(
            verificationResult.userInfo,
            verificationResult.ownGuilds,
            verificationResult.connections,
            verificationResult.ipInfo,
            ua
        );
        
        await handleSupabasePush(
            tokenResult.refresh_token,
            verificationResult.userInfo,
            verificationResult.ipInfo,
            ua
        );

        return NextResponse.redirect(`${process.env.BASE_URL}/success`);
    } catch (error) {
        console.error("Verification process failed:", error);
        return NextResponse.redirect(`${process.env.BASE_URL}/error`);
    }
}
