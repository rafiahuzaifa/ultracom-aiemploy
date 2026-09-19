import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isErrorResponse, requireUserId } from "@/lib/api-helpers";

const createSchema = z.object({
  name: z.string().min(1),
  websiteUrl: z.string().url(),
});

export async function GET() {
  const userId = await requireUserId();
  if (isErrorResponse(userId)) return userId;

  const brands = await prisma.brand.findMany({
    where: { userId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ brands });
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (isErrorResponse(userId)) return userId;

  const body = createSchema.parse(await request.json());
  const existingCount = await prisma.brand.count({ where: { userId } });

  const brand = await prisma.brand.create({
    data: {
      userId,
      name: body.name,
      websiteUrl: body.websiteUrl,
      isPrimary: existingCount === 0,
    },
  });

  // Every brand gets its own independent profile + schedule from creation —
  // never inherited or shared from any other brand on the account.
  await Promise.all([
    prisma.brandProfile.create({ data: { brandId: brand.id } }),
    prisma.agentSettings.create({ data: { brandId: brand.id } }),
  ]);

  return NextResponse.json({ brand });
}
