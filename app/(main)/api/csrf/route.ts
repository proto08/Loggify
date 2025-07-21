import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData, clearSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const response = new NextResponse();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);
  try {
    if (!session.csrfToken) {
      await clearSession(session);
      return NextResponse.json({ status: 400 });
    }
    const successResponse = NextResponse.json({ csrfToken: session.csrfToken }, { status: 200 });
    const cookie = response.headers.get("Set-Cookie");
    if (cookie) {
      successResponse.headers.set("Set-Cookie", cookie);
    }
    return successResponse;
  } catch (error) {
    console.log("Error in /api/csrf:", error);
    await clearSession(session);
    return NextResponse.json({ status: 500 });
  }
}
