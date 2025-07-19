import {
  BASE_URL,
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  TURNSTILE_SECRET_KEY,
} from "@/lib/constants";

export async function validateToken(token: string) {
  try {
    const verificationResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret: TURNSTILE_SECRET_KEY,
          response: token,
        }),
      }
    );

    if (!verificationResponse.ok) {
      throw new Error("Failed to verify token");
    }

    return await verificationResponse.json();
  } catch (error) {
    console.log("Error in verify csrf token:", error);
    throw error;
  }
}

export async function getAccessToken(code: string) {
  try {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${BASE_URL}/api/callback`,
    }).toString();

    const token = await fetch(`https://discord.com/api/v10/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(`${DISCORD_CLIENT_ID}:${DISCORD_CLIENT_SECRET}`).toString("base64"),
      },
      body,
    });

    if (!token.ok) {
      throw new Error("Failed to fetch token");
    }

    return await token.json();
  } catch (error) {
    console.log("Error in get token from discord:", error);
    throw error;
  }
}
