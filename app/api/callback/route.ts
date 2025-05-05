import { NextRequest, NextResponse } from "next/server";
import { obf } from "@/lib/functions/anti-scraping";
export async function GET(req: NextRequest) {
    try {
        const code = new URL(req.url).searchParams.get("code");

        if (!code) {
            throw new Error("No code provided");
        }
        const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
        const obfuscatedIp = obf(ip)
        return NextResponse.redirect(`${process.env.BASE_URL}/verify?code=${code}&gfe=${obfuscatedIp}`);
    } catch {
        return NextResponse.redirect(`${process.env.BASE_URL}/error`);
    }
}
