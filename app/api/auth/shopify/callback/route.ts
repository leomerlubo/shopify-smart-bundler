import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "../../../../../lib/firebase-admin";

type ShopifyTokenResponse = {
  access_token: string;
  scope: string;
};

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function encryptAccessToken(accessToken: string, shop: string) {
  const key = crypto.createHash("sha256").update(required("SHOPIFY_API_SECRET")).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(shop));
  const encrypted = Buffer.concat([cipher.update(accessToken, "utf8"), cipher.final()]);

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    algorithm: "aes-256-gcm",
    version: 1
  };
}

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
  const digest = crypto.createHmac("sha256", required("SHOPIFY_API_SECRET")).update(message).digest("hex");
  const validHmac =
    hmac.length === digest.length &&
    crypto.timingSafeEqual(Buffer.from(digest, "utf8"), Buffer.from(hmac, "utf8"));
  if (!validHmac) {
    return NextResponse.json({ error: "Shopify signature verification failed." }, { status: 401 });
  }

  const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: required("SHOPIFY_API_KEY"),
      client_secret: required("SHOPIFY_API_SECRET"),
      code
    })
  });
  if (!tokenResponse.ok) return NextResponse.json({ error: "Shopify token exchange failed." }, { status: 502 });

  const tokenData = (await tokenResponse.json()) as ShopifyTokenResponse;
  if (!tokenData.access_token) {
    return NextResponse.json({ error: "Shopify did not return an access token." }, { status: 502 });
  }

  await getAdminDb().collection("shops").doc(shop).set(
    {
      shop,
      status: "active",
      scopes: tokenData.scope
        .split(",")
        .map(scope => scope.trim())
        .filter(Boolean),
      token: encryptAccessToken(tokenData.access_token, shop),
      installedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  const response = NextResponse.redirect(
    new URL(`/?shop=${encodeURIComponent(shop)}&connected=1`, required("SHOPIFY_APP_URL"))
  );
  response.cookies.delete("shopify_oauth_state");
  return response;
}
