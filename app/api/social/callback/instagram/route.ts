import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { getIntegrationSettings } from "@/lib/integrations";
import {
  exchangeForLongLivedInstagramToken,
  exchangeInstagramCode,
  getInstagramProfile,
} from "@/lib/social/instagram";

export async function GET(request: Request) {
  const session = await auth();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  const { searchParams } = new URL(request.url);

  // Instagram redirects with these instead of `code` when authorization
  // itself failed or was denied — surface that directly rather than
  // masking it as a generic state-validation failure.
  const igError = searchParams.get("error");
  const igErrorReason = searchParams.get("error_reason");
  const igErrorDescription = searchParams.get("error_description");
  if (igError) {
    return NextResponse.redirect(
      new URL(
        `/accounts?error=${encodeURIComponent(`ig_${igError}: ${igErrorReason ?? ""} ${igErrorDescription ?? ""}`)}`,
        appUrl
      )
    );
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieValue = request.headers
    .get("cookie")
    ?.split("; ")
    .find((c) => c.startsWith("instagram_oauth_state="))
    ?.split("=")[1];
  const [cookieNonce, brandId] = cookieValue?.split(":") ?? [];

  // Broken out into specific reasons (temporarily) since the generic
  // combined check gave no way to tell which condition was actually
  // failing during rollout.
  if (!code) {
    return NextResponse.redirect(new URL("/accounts?error=ig_missing_code", appUrl));
  }
  if (!state) {
    return NextResponse.redirect(new URL("/accounts?error=ig_missing_state_param", appUrl));
  }
  if (!cookieValue) {
    return NextResponse.redirect(new URL("/accounts?error=ig_missing_cookie", appUrl));
  }
  if (!brandId) {
    return NextResponse.redirect(new URL("/accounts?error=ig_missing_brandid_in_cookie", appUrl));
  }
  if (state !== cookieNonce) {
    return NextResponse.redirect(new URL("/accounts?error=ig_state_mismatch", appUrl));
  }

  const brand = await prisma.brand.findFirst({ where: { id: brandId, userId: session.user.id } });
  if (!brand) {
    return NextResponse.redirect(new URL("/accounts?error=brand_not_found", appUrl));
  }

  try {
    const settings = await getIntegrationSettings(session.user.id);
    if (!settings.instagramAppId || !settings.instagramAppSecret) {
      throw new Error("Instagram app credentials are not configured.");
    }

    const redirectUri = `${appUrl}/api/social/callback/instagram`;
    const { accessToken: shortLivedToken } = await exchangeInstagramCode({
      code,
      appId: settings.instagramAppId,
      appSecret: settings.instagramAppSecret,
      redirectUri,
    });

    const { accessToken, expiresIn } = await exchangeForLongLivedInstagramToken({
      shortLivedToken,
      appSecret: settings.instagramAppSecret,
    });

    const profile = await getInstagramProfile(accessToken);
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await prisma.socialAccount.upsert({
      where: {
        brandId_platform_accountId: { brandId, platform: "INSTAGRAM", accountId: profile.id },
      },
      update: {
        accessToken: encrypt(accessToken),
        accountName: profile.username,
        expiresAt,
        isActive: true,
      },
      create: {
        brandId,
        platform: "INSTAGRAM",
        accountId: profile.id,
        accountName: profile.username,
        accessToken: encrypt(accessToken),
        expiresAt,
      },
    });

    const response = NextResponse.redirect(
      new URL(`/brands?brandId=${brandId}&connected=instagram`, appUrl)
    );
    response.cookies.delete("instagram_oauth_state");
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    return NextResponse.redirect(
      new URL(`/brands?brandId=${brandId}&error=${encodeURIComponent(message)}`, appUrl)
    );
  }
}
