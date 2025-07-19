import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";

export async function GET(req: NextRequest) {
  const res = new NextResponse();
  try {
    const session = await getIronSession<SessionData>(req, res, sessionOptions);

    if (!session.csrfToken) {
      const errorResponse = NextResponse.json({ status: 400 });
      const cookie = res.headers.get("Set-Cookie");

      if (cookie) {
        errorResponse.headers.set("Set-Cookie", cookie);
      }
      return errorResponse;
    }

    const successResponse = NextResponse.json({ csrfToken: session.csrfToken }, { status: 200 });
    const cookie = res.headers.get("Set-Cookie");
    if (cookie) {
      successResponse.headers.set("Set-Cookie", cookie);
    }
    return successResponse;
  } catch (error) {
    console.log("Error in /api/csrf:", error);
    return NextResponse.json({ status: 500 });
  }
}
