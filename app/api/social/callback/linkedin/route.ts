import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { parseOAuthStateCookie } from "@/lib/social/oauth-state";
import { getIntegrationSettings } from "@/lib/integrations";

export async function GET(request: Request) {
  const session = await auth();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const { nonce: cookieNonce, brandId } = parseOAuthStateCookie(
    request.headers.get("cookie"),
    "linkedin_oauth_state"
  );

  if (!code || !state || !brandId || state !== cookieNonce) {
    return NextResponse.redirect(new URL("/accounts?error=linkedin_oauth_state", appUrl));
  }

  const brand = await prisma.brand.findFirst({ where: { id: brandId, userId: session.user.id } });
  if (!brand) {
    return NextResponse.redirect(new URL("/accounts?error=brand_not_found", appUrl));
  }

  try {
    const settings = await getIntegrationSettings(session.user.id);
    const redirectUri = `${appUrl}/api/social/callback/linkedin`;
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: settings.linkedinClientId ?? "",
        client_secret: settings.linkedinClientSecret ?? "",
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokenData?.error_description || "Token exchange failed");

    const accessToken = tokenData.access_token as string;
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    const orgsRes = await fetch(
      "https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organization~(id,localizedName,logoV2)))",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const orgsData = await orgsRes.json();
    if (!orgsRes.ok) throw new Error(orgsData?.message || "Fetching organizations failed");

    const elements = orgsData.elements ?? [];
    for (const el of elements) {
      const org = el["organization~"];
      if (!org) continue;
      const orgId = String(org.id);
      await prisma.socialAccount.upsert({
        where: {
          brandId_platform_accountId: { brandId, platform: "LINKEDIN", accountId: orgId },
        },
        update: {
          accessToken: encrypt(accessToken),
          accountName: org.localizedName,
          expiresAt,
          isActive: true,
        },
        create: {
          brandId,
          platform: "LINKEDIN",
          accountId: orgId,
          accountName: org.localizedName,
          accessToken: encrypt(accessToken),
          expiresAt,
        },
      });
    }

    const response = NextResponse.redirect(
      new URL(`/brands?brandId=${brandId}&connected=linkedin`, appUrl)
    );
    response.cookies.delete("linkedin_oauth_state");
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    return NextResponse.redirect(
      new URL(`/brands?brandId=${brandId}&error=${encodeURIComponent(message)}`, appUrl)
    );
  }
}
