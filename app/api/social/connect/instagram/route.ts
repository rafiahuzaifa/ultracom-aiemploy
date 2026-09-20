import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createOAuthState } from "@/lib/social/oauth-state";
import { getIntegrationSettings } from "@/lib/integrations";

// "Instagram API with Instagram Login" scopes for publishing content.
const SCOPES = ["instagram_business_basic", "instagram_business_content_publish"].join(",");

export async function GET(request: Request) {
  const session = await auth();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  const brandId = new URL(request.url).searchParams.get("brandId");
  if (!brandId) {
    return NextResponse.redirect(new URL("/accounts?error=missing_brand", appUrl));
  }
  const brand = await prisma.brand.findFirst({ where: { id: brandId, userId: session.user.id } });
  if (!brand) {
    return NextResponse.redirect(new URL("/accounts?error=brand_not_found", appUrl));
  }

  const settings = await getIntegrationSettings(session.user.id);
  if (!settings.instagramAppId || !settings.instagramAppSecret) {
    return NextResponse.redirect(
      new URL(`/brands?brandId=${brandId}&error=instagram_not_configured`, appUrl)
    );
  }

  const nonce = createOAuthState();
  const redirectUri = `${appUrl}/api/social/callback/instagram`;
  const authUrl = new URL("https://www.instagram.com/oauth/authorize");
  authUrl.searchParams.set("client_id", settings.instagramAppId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("state", nonce);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("instagram_oauth_state", `${nonce}:${brandId}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return response;
}
