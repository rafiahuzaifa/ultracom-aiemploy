import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isErrorResponse, requireUserId } from "@/lib/api-helpers";
import type { PostStatus } from "@prisma/client";

export async function GET(request: Request) {
  const userId = await requireUserId();
  if (isErrorResponse(userId)) return userId;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as PostStatus | null;

  const posts = await prisma.generatedPost.findMany({
    where: { userId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ posts });
}
