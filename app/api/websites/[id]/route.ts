import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isErrorResponse, requireUserId } from "@/lib/api-helpers";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isErrorResponse(userId)) return userId;
  const { id } = await params;

  const website = await prisma.website.findFirst({ where: { id, userId } });
  if (!website) return NextResponse.json({ error: "Website not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  if (body.setPrimary) {
    await prisma.website.updateMany({ where: { userId }, data: { isPrimary: false } });
    const updated = await prisma.website.update({ where: { id }, data: { isPrimary: true } });
    return NextResponse.json({ website: updated });
  }

  const updated = await prisma.website.update({
    where: { id },
    data: {
      name: body.name ?? website.name,
    },
  });
  return NextResponse.json({ website: updated });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isErrorResponse(userId)) return userId;
  const { id } = await params;

  const website = await prisma.website.findFirst({ where: { id, userId } });
  if (!website) return NextResponse.json({ error: "Website not found" }, { status: 404 });

  await prisma.website.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
