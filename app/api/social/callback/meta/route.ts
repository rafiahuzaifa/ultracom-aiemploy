import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { listFacebookPages } from "@/lib/social/facebook";
import { parseOAuthStateCookie } from "@/lib/social/oauth-state";
import { getIntegrationSettings } from "@/lib/integrations";

export const dynamic = "force-dynamic";

const GRAPH_VERSION = "v21.0";

export async function GET(request: Request) {
  const session = await auth();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  const { searchParams } = new URL(request.url);

  const fbError = searchParams.get("error");
  const fbErrorReason = searchParams.get("error_reason");
  const fbErrorDescription = searchParams.get("error_description");
  if (fbError) {
    return NextResponse.redirect(
      new URL(
        `/accounts?error=${encodeURIComponent(`fb_${fbError}: ${fbErrorReason ?? ""} ${fbErrorDescription ?? ""}`)}`,
        appUrl
      )
    );
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const { nonce: cookieNonce, brandId } = parseOAuthStateCookie(
    request.headers.get("cookie"),
    "meta_oauth_state"
  );

  // Temporarily granular (same approach that found the Instagram bug) to
  // pinpoint which condition is actually failing.
  if (!code) {
    return NextResponse.redirect(new URL("/accounts?error=fb_missing_code", appUrl));
  }
  if (!state) {
    return NextResponse.redirect(new URL("/accounts?error=fb_missing_state_param", appUrl));
  }
  if (!cookieNonce) {
    return NextResponse.redirect(new URL("/accounts?error=fb_missing_cookie", appUrl));
  }
  if (!brandId) {
    return NextResponse.redirect(new URL("/accounts?error=fb_missing_brandid_in_cookie", appUrl));
  }
  if (state !== cookieNonce) {
    return NextResponse.redirect(new URL("/accounts?error=fb_state_mismatch", appUrl));
  }

  const brand = await prisma.brand.findFirst({ where: { id: brandId, userId: session.user.id } });
  if (!brand) {
    return NextResponse.redirect(new URL("/accounts?error=brand_not_found", appUrl));
  }

  try {
    const settings = await getIntegrationSettings(session.user.id);
    const redirectUri = `${appUrl}/api/social/callback/meta`;
    const tokenParams = new URLSearchParams({
      client_id: settings.metaAppId ?? "",
      client_secret: settings.metaAppSecret ?? "",
      redirect_uri: redirectUri,
      code,
    });
    const tokenRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?${tokenParams}`
    );
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokenData?.error?.message || "Token exchange failed");

    const pages = await listFacebookPages(tokenData.access_token);

    for (const page of pages) {
      await prisma.socialAccount.upsert({
        where: {
          brandId_platform_accountId: { brandId, platform: "FACEBOOK", accountId: page.id },
        },
        update: { accessToken: encrypt(page.access_token), accountName: page.name, isActive: true },
        create: {
          brandId,
          platform: "FACEBOOK",
          accountId: page.id,
          accountName: page.name,
          accessToken: encrypt(page.access_token),
        },
      });
    }
    // Instagram is connected separately via /api/social/connect/instagram
    // ("Instagram API with Instagram Login"), which has its own app
    // credentials — this route only ever creates Facebook Page accounts.

    const response = NextResponse.redirect(
      new URL(`/brands?brandId=${brandId}&connected=meta`, appUrl)
    );
    response.cookies.delete("meta_oauth_state");
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    return NextResponse.redirect(
      new URL(`/brands?brandId=${brandId}&error=${encodeURIComponent(message)}`, appUrl)
    );
  }
}
