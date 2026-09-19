import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function requireUserId(): Promise<string | NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return userId;
}

export function isErrorResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

/**
 * Verifies the given brand belongs to the given user before any brand-scoped
 * data is read or written — the sole authorization boundary that keeps one
 * user's brands (and everything under them: posts, accounts, runs) from
 * ever being reachable by another user.
 */
export async function requireOwnedBrand(userId: string, brandId: string) {
  const brand = await prisma.brand.findFirst({ where: { id: brandId, userId } });
  if (!brand) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }
  return brand;
}
