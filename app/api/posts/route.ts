import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isErrorResponse, requireOwnedBrand, requireUserId } from "@/lib/api-helpers";
import type { PostStatus } from "@prisma/client";

export async function GET(request: Request) {
  const userId = await requireUserId();
  if (isErrorResponse(userId)) return userId;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as PostStatus | null;
  const brandId = searchParams.get("brandId");

  if (brandId) {
    const brand = await requireOwnedBrand(userId, brandId);
    if (isErrorResponse(brand)) return brand;
  }

  const posts = await prisma.generatedPost.findMany({
    where: {
      brand: { userId },
      ...(brandId ? { brandId } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { media: { orderBy: { order: "asc" } }, brand: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ posts });
}
