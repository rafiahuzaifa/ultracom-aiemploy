import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isErrorResponse, requireUserId } from "@/lib/api-helpers";

const settingsSchema = z.object({
  isActive: z.boolean().optional(),
  frequencyHours: z.number().int().min(1).max(168).optional(),
  postsPerRun: z.number().int().min(1).max(3).optional(),
  notifyOnReady: z.boolean().optional(),
  autoApprove: z.boolean().optional(),
});

export async function GET() {
  const userId = await requireUserId();
  if (isErrorResponse(userId)) return userId;

  const settings = await prisma.agentSettings.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const userId = await requireUserId();
  if (isErrorResponse(userId)) return userId;

  const body = settingsSchema.parse(await request.json());
  const settings = await prisma.agentSettings.upsert({
    where: { userId },
    update: body,
    create: { userId, ...body },
  });
  return NextResponse.json({ settings });
}
