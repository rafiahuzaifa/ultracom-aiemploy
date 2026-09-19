import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createOAuthState } from "@/lib/social/oauth-state";

const SCOPES = ["w_organization_social", "r_organization_admin", "rw_organization_admin"].join(" ");

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

  const nonce = createOAuthState();
  const redirectUri = `${appUrl}/api/social/callback/linkedin`;
  const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", process.env.LINKEDIN_CLIENT_ID ?? "");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", nonce);
  authUrl.searchParams.set("scope", SCOPES);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("linkedin_oauth_state", `${nonce}:${brandId}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return response;
}
