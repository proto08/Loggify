import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const res = new NextResponse();
  try {
    const session = await getIronSession<SessionData>(req, res, sessionOptions);
    const code = new URL(req.url).searchParams.get("code");

    if (!code) {
      throw new Error("No code provided");
    }

    const csrfToken = crypto.randomBytes(32).toString("hex");

    session.code = code;
    session.csrfToken = csrfToken;
    await session.save();

    return createRedirectResponse("/verify", res);
  } catch (error) {
    console.log("Error in api/callback:", error);
    return createRedirectResponse("/error", res);
  }
}

function createRedirectResponse(path: string, res: NextResponse): NextResponse {
  const redirectUrl = new URL(path, process.env.BASE_URL);
  const response = NextResponse.redirect(redirectUrl);

  const cookie = res.headers.get("Set-Cookie");

  if (cookie) {
    response.headers.set("Set-Cookie", cookie);
  }

  return response;
}
