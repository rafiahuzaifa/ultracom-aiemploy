import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isErrorResponse, requireOwnedBrand, requireUserId } from "@/lib/api-helpers";

export async function GET(request: Request) {
  const userId = await requireUserId();
  if (isErrorResponse(userId)) return userId;

  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get("brandId");
  if (!brandId) return NextResponse.json({ error: "brandId is required" }, { status: 400 });

  const brand = await requireOwnedBrand(userId, brandId);
  if (isErrorResponse(brand)) return brand;

  const accounts = await prisma.socialAccount.findMany({
    where: { brandId },
    select: {
      id: true,
      platform: true,
      accountId: true,
      accountName: true,
      avatarUrl: true,
      isActive: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ accounts });
}
