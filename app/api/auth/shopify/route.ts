import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const shop = request.nextUrl.searchParams.get("shop")?.trim().toLowerCase();
  if (!shop || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) {
    return NextResponse.json({ error: "Enter a valid myshopify.com store domain." }, { status: 400 });
  }

  const state = crypto.randomBytes(20).toString("hex");
  const redirectUri = new URL("/api/auth/shopify/callback", process.env.SHOPIFY_APP_URL).toString();
  const params = new URLSearchParams({
    client_id: process.env.SHOPIFY_API_KEY || "",
    scope: process.env.SHOPIFY_SCOPES || "read_products,write_products,read_inventory",
    redirect_uri: redirectUri,
    state
  });

  const response = NextResponse.redirect(`https://${shop}/admin/oauth/authorize?${params}`);
  response.cookies.set("shopify_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600 });
  return response;
}
