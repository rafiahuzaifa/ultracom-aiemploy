import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isErrorResponse, requireUserId } from "@/lib/api-helpers";

const brandProfileSchema = z.object({
  brandVoice: z.string().optional(),
  tone: z.string().optional(),
  targetAudience: z.string().optional(),
  uniqueSellingPoints: z.array(z.string()).optional(),
  languagePreference: z.enum(["EN", "UR", "BOTH"]).optional(),
  contentTypes: z.array(z.enum(["IMAGE", "CAROUSEL", "REEL"])).min(1).optional(),
  dos: z.string().optional(),
  donts: z.string().optional(),
  websiteId: z.string().optional(),
});

export async function GET() {
  const userId = await requireUserId();
  if (isErrorResponse(userId)) return userId;

  const profile = await prisma.brandProfile.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  return NextResponse.json({ profile });
}

export async function PATCH(request: Request) {
  const userId = await requireUserId();
  if (isErrorResponse(userId)) return userId;

  const body = brandProfileSchema.parse(await request.json());
  const profile = await prisma.brandProfile.upsert({
    where: { userId },
    update: body,
    create: { userId, ...body },
  });
  return NextResponse.json({ profile });
}
