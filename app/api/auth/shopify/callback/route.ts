import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const shop = params.get("shop") || "";
  const code = params.get("code") || "";
  const state = params.get("state") || "";
  const cookieState = request.cookies.get("shopify_oauth_state")?.value || "";

  if (!shop || !code || !state || state !== cookieState) {
    return NextResponse.json({ error: "Invalid Shopify authorization response." }, { status: 400 });
  }

  const hmac = params.get("hmac") || "";
  const message = [...params.entries()].filter(([key]) => key !== "hmac" && key !== "signature").sort().map(([key, value]) => `${key}=${value}`).join("&");
  const digest = crypto.createHmac("sha256", process.env.SHOPIFY_API_SECRET || "").update(message).digest("hex");
  if (!hmac || !crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac))) {
    return NextResponse.json({ error: "Shopify signature verification failed." }, { status: 401 });
  }

  const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_API_KEY, client_secret: process.env.SHOPIFY_API_SECRET, code })
  });
  if (!tokenResponse.ok) return NextResponse.json({ error: "Shopify token exchange failed." }, { status: 502 });

  // The access token will be encrypted and stored server side in Firebase during the database milestone.
  const response = NextResponse.redirect(new URL(`/?shop=${encodeURIComponent(shop)}&connected=1`, process.env.SHOPIFY_APP_URL));
  response.cookies.delete("shopify_oauth_state");
  return response;
}
