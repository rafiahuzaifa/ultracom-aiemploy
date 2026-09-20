import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { listFacebookPages } from "@/lib/social/facebook";
import { getIntegrationSettings } from "@/lib/integrations";

const GRAPH_VERSION = "v21.0";

export async function GET(request: Request) {
  const session = await auth();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieValue = request.headers
    .get("cookie")
    ?.split("; ")
    .find((c) => c.startsWith("meta_oauth_state="))
    ?.split("=")[1];
  const [cookieNonce, brandId] = cookieValue?.split(":") ?? [];

  if (!code || !state || !brandId || state !== cookieNonce) {
    return NextResponse.redirect(new URL("/accounts?error=meta_oauth_state", appUrl));
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
