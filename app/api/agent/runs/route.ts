import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isErrorResponse, requireOwnedBrand, requireUserId } from "@/lib/api-helpers";

export async function GET(request: Request) {
  const userId = await requireUserId();
  if (isErrorResponse(userId)) return userId;

  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get("brandId");

  if (brandId) {
    const brand = await requireOwnedBrand(userId, brandId);
    if (isErrorResponse(brand)) return brand;
  }

  const runs = await prisma.agentRun.findMany({
    where: { brand: { userId }, ...(brandId ? { brandId } : {}) },
    orderBy: { startedAt: "desc" },
    take: 20,
    include: { brand: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ runs });
}
