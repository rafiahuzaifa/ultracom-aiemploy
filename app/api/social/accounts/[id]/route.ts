import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isErrorResponse, requireUserId } from "@/lib/api-helpers";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isErrorResponse(userId)) return userId;
  const { id } = await params;

  const account = await prisma.socialAccount.findFirst({ where: { id, brand: { userId } } });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  await prisma.socialAccount.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
