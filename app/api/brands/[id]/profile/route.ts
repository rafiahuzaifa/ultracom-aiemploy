import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isErrorResponse, requireOwnedBrand, requireUserId } from "@/lib/api-helpers";

const profileSchema = z.object({
  brandVoice: z.string().optional(),
  tone: z.string().optional(),
  targetAudience: z.string().optional(),
  uniqueSellingPoints: z.array(z.string()).optional(),
  languagePreference: z.enum(["EN", "UR", "BOTH"]).optional(),
  contentTypes: z.array(z.enum(["IMAGE", "CAROUSEL", "REEL"])).min(1).optional(),
  dos: z.string().optional(),
  donts: z.string().optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isErrorResponse(userId)) return userId;
  const { id } = await params;

  const brand = await requireOwnedBrand(userId, id);
  if (isErrorResponse(brand)) return brand;

  const profile = await prisma.brandProfile.upsert({
    where: { brandId: id },
    update: {},
    create: { brandId: id },
  });
  return NextResponse.json({ profile });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isErrorResponse(userId)) return userId;
  const { id } = await params;

  const brand = await requireOwnedBrand(userId, id);
  if (isErrorResponse(brand)) return brand;

  const body = profileSchema.parse(await request.json());
  const profile = await prisma.brandProfile.upsert({
    where: { brandId: id },
    update: body,
    create: { brandId: id, ...body },
  });
  return NextResponse.json({ profile });
}
