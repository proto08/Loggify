import { NextRequest, NextResponse } from "next/server";
import { obf, obf2 } from "@/lib/functions/anti-scraping";
import { isValidIP, isValidUserAgent } from "@/lib/functions/validation";


export async function GET(req: NextRequest) {
    try {
        const code = new URL(req.url).searchParams.get("code");

        if (!code) {
            throw new Error("No code provided");
        }
        
        const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
        const ua = req.headers.get("user-agent") ?? "";

        if (!isValidIP(ip)) {
            throw new Error("Invalid IP");
        }

        if (!isValidUserAgent(ua)) {
            throw new Error("Invalid User-Agent");
        }

        const obfuscatedIp = obf(ip)
        const obfuscatedCode = obf2(code)
        return NextResponse.redirect(`${process.env.BASE_URL}/verify?gfe=${obfuscatedIp}&lfg=${obfuscatedCode}`);
    } catch (error) {
        console.log(error)
        return NextResponse.redirect(`${process.env.BASE_URL}/error`);
    }
}
