import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isErrorResponse, requireOwnedBrand, requireUserId } from "@/lib/api-helpers";

const settingsSchema = z.object({
  isActive: z.boolean().optional(),
  frequencyHours: z.number().int().min(1).max(168).optional(),
  postsPerRun: z.number().int().min(1).max(3).optional(),
  notifyOnReady: z.boolean().optional(),
  autoApprove: z.boolean().optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isErrorResponse(userId)) return userId;
  const { id } = await params;

  const brand = await requireOwnedBrand(userId, id);
  if (isErrorResponse(brand)) return brand;

  const settings = await prisma.agentSettings.upsert({
    where: { brandId: id },
    update: {},
    create: { brandId: id },
  });
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isErrorResponse(userId)) return userId;
  const { id } = await params;

  const brand = await requireOwnedBrand(userId, id);
  if (isErrorResponse(brand)) return brand;

  const body = settingsSchema.parse(await request.json());
  const settings = await prisma.agentSettings.upsert({
    where: { brandId: id },
    update: body,
    create: { brandId: id, ...body },
  });
  return NextResponse.json({ settings });
}
