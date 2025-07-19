import { logger } from "@/lib/functions/logger";
import { NextRequest, NextResponse } from "next/server";
import { assignRole } from "@/lib/functions/assign-role";
import { getInfo } from "@/lib/functions/get-info";
import { getToken, verifyToken } from "@/lib/functions/verify";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";

export async function POST(req: NextRequest) {
  const res = new NextResponse();
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  try {
    const body = await req.json();
    const { token } = body;
    const csrfToken = req.headers.get("X-CSRF-Token");

    if (!token || !csrfToken || !session.code) {
      console.log("Missing required parameters: token, csrfToken, or session.code not found");
      return NextResponse.json({ status: 400 });
    }

    if (!session.csrfToken || session.csrfToken !== csrfToken) {
      console.log("CSRF token is incorrect");
      return NextResponse.json({ status: 400 });
    }

    await verifyToken(token);
    const getTokenResult = await getToken(session.code as string);
    const userInfo = await getInfo(getTokenResult.access_token);
    await assignRole(userInfo.id.toString());
    await logger(userInfo);

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
