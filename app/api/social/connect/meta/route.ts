import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createOAuthState } from "@/lib/social/oauth-state";
import { getIntegrationSettings } from "@/lib/integrations";

// Instagram is connected separately via /api/social/connect/instagram
// ("Instagram API with Instagram Login"), so no Instagram scopes are
// requested here — this flow only ever needs Facebook Page access.
export const dynamic = "force-dynamic";

const SCOPES = ["pages_show_list", "pages_read_engagement", "pages_manage_posts", "business_management"].join(
  ","
);

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
  if (!settings.metaAppId || !settings.metaAppSecret) {
    return NextResponse.redirect(
      new URL(`/brands?brandId=${brandId}&error=meta_not_configured`, appUrl)
    );
  }

  const nonce = createOAuthState();
  const redirectUri = `${appUrl}/api/social/callback/meta`;
  const authUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  authUrl.searchParams.set("client_id", settings.metaAppId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", nonce);
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("response_type", "code");

  const response = NextResponse.redirect(authUrl);
  // Cookie carries both the CSRF nonce and which brand this connection is
  // for, so the callback knows where to attach the resulting accounts
  // without trusting anything from the client-controlled query string.
  response.cookies.set("meta_oauth_state", `${nonce}:${brandId}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return response;
}
