import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { inngest } from "@/lib/inngest/client";
import { isErrorResponse, requireOwnedBrand, requireUserId } from "@/lib/api-helpers";

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (isErrorResponse(userId)) return userId;

  const body = await request.json().catch(() => ({}));
  const brandId = typeof body?.brandId === "string" ? body.brandId : undefined;

  if (brandId === "all") {
    const brands = await prisma.brand.findMany({ where: { userId }, select: { id: true } });
    if (brands.length === 0) {
      return NextResponse.json({ error: "No brands to run." }, { status: 400 });
    }
    await inngest.send(
      brands.map((b) => ({
        name: "agent/run.requested" as const,
        data: { brandId: b.id, trigger: "manual" as const },
      }))
    );
    return NextResponse.json({ ok: true, queued: brands.length });
  }

  if (!brandId) {
    return NextResponse.json({ error: "brandId is required" }, { status: 400 });
  }

  const brand = await requireOwnedBrand(userId, brandId);
  if (isErrorResponse(brand)) return brand;

  await inngest.send({
    name: "agent/run.requested",
    data: { brandId, trigger: "manual" },
  });

  return NextResponse.json({ ok: true });
}
