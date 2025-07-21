import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData, clearSession } from "@/lib/session";
import { isHosting } from "@/lib/functions/ip-check";
import crypto from "crypto";

function createRedirectResponse(path: string, res: NextResponse): NextResponse {
  const redirectUrl = new URL(path, process.env.BASE_URL);
  const response = NextResponse.redirect(redirectUrl);
  const cookie = res.headers.get("Set-Cookie");
  if (cookie) {
    response.headers.set("Set-Cookie", cookie);
  }
  return response;
}

export async function GET(req: NextRequest) {
  const response = new NextResponse();
  const session = await getIronSession<SessionData>(req, response, sessionOptions);
  try {
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";
    if (await isHosting(ipAddress)) {
      console.log(`VPN / Proxy detected: ${ipAddress}`);
      return createRedirectResponse("/result/vpn", response);
    }
    const code = new URL(req.url).searchParams.get("code");
    if (!code) {
      throw new Error("No code provided");
    }

    const csrfToken = crypto.randomBytes(32).toString("hex");
    session.code = code;
    session.csrfToken = csrfToken;
    await session.save();
    return createRedirectResponse("/verify", response);
  } catch (error) {
    console.log("Error in api/callback:", error);
    await clearSession(session);
    return createRedirectResponse("/result/error", response);
  }
}

