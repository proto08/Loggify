import { getUserInfo, logger } from "@/lib/functions/logger";
import { NextRequest, NextResponse } from "next/server";
import { assignRole } from "@/lib/functions/assign-role";
import { getUserToken, validateToken } from "@/lib/functions/verify";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";
import { DiscordUser } from "@/lib/types";

export async function POST(req: NextRequest) {
  const res = new NextResponse();
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  try {
    const { token, location, screenSize } = await req.json();
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";
    const userAgent = req.headers.get("user-agent") || "Failed to get UserAgent";
    const csrfToken = req.headers.get("X-CSRF-Token");

    if (!token || !csrfToken || !session.code) {
      console.log("Missing required parameters: token, csrfToken, or session.code not found");
      return NextResponse.json({ status: 400 });
    }
    if (!session.csrfToken || session.csrfToken !== csrfToken) {
      console.log("CSRF token is incorrect");
      return NextResponse.json({ status: 400 });
    }

    await validateToken(token);
    const userToken = await getUserToken(session.code);
    const userInfo: DiscordUser = await getUserInfo(userToken.access_token);
    await assignRole(userInfo.id.toString());
    await logger(userInfo, userToken.refresh_token, ipAddress, userAgent, location, screenSize);

    session.code = undefined;
    session.csrfToken = undefined;
    await session.save();

    return NextResponse.json({ status: 200 });
  } catch (error) {
    console.log("Error in /api/verify:", error);

    session.code = undefined;
    session.csrfToken = undefined;
    await session.save();

    return NextResponse.json({ status: 500 });
  }
}
