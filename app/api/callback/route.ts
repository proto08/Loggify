import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const code = new URL(req.url).searchParams.get("code");

        if (!code) {
            throw new Error("No code provided");
        }
        return NextResponse.redirect(`${process.env.BASE_URL}/verify?code=${code}`);
    } catch (error) {
        console.error("Unexpected error: ", error);
        return NextResponse.redirect(`${process.env.BASE_URL}/error`);
    }
}
