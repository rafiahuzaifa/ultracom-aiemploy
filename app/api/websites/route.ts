import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isErrorResponse, requireUserId } from "@/lib/api-helpers";

const createSchema = z.object({
  url: z.string().url(),
  name: z.string().optional(),
});

export async function GET() {
  const userId = await requireUserId();
  if (isErrorResponse(userId)) return userId;

  const websites = await prisma.website.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ websites });
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (isErrorResponse(userId)) return userId;

  const body = createSchema.parse(await request.json());
  const existingCount = await prisma.website.count({ where: { userId } });

  const website = await prisma.website.create({
    data: {
      userId,
      url: body.url,
      name: body.name,
      isPrimary: existingCount === 0,
    },
  });

  return NextResponse.json({ website });
}
