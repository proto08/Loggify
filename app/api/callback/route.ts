import { NextRequest, NextResponse } from "next/server";


export async function GET(req: NextRequest) {

    const ip = (req.headers.get("x-forwarded-for") ?? "127.0.0.1").split(",")[0];

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    console.log(code);

    if (!code) {
        return NextResponse.redirect("/error");
    }

    const body = new URLSearchParams({
        "grant_type": "authorization_code",
        "code": String(code),
        "redirect_uri": `${process.env.BASE_URL}/api/callback`,
    }).toString();

    try {
        const response = await fetch(`https://discord.com/api/v10/oauth2/token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": "Basic " + Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString("base64")
            },
            body: body
        });

        if (!response.ok) {
            const errorData = await response.json(); 
            console.error("Error fetching token:", errorData);
            return NextResponse.redirect(`${process.env.BASE_URL}/error`);
        }

        const result = await response.json();

        return NextResponse.json(result+ip);
    } catch (err) {
        console.error("Fetch error:", err);
        return NextResponse.redirect(`${process.env.BASE_URL}/error`);
    }
}
