import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isErrorResponse, requireOwnedBrand, requireUserId } from "@/lib/api-helpers";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isErrorResponse(userId)) return userId;
  const { id } = await params;

  const brand = await requireOwnedBrand(userId, id);
  if (isErrorResponse(brand)) return brand;

  return NextResponse.json({ brand });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isErrorResponse(userId)) return userId;
  const { id } = await params;

  const brand = await requireOwnedBrand(userId, id);
  if (isErrorResponse(brand)) return brand;

  const body = await request.json().catch(() => ({}));

  if (body.setPrimary) {
    await prisma.brand.updateMany({ where: { userId }, data: { isPrimary: false } });
    const updated = await prisma.brand.update({ where: { id }, data: { isPrimary: true } });
    return NextResponse.json({ brand: updated });
  }

  const updated = await prisma.brand.update({
    where: { id },
    data: { name: body.name ?? brand.name },
  });
  return NextResponse.json({ brand: updated });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isErrorResponse(userId)) return userId;
  const { id } = await params;

  const brand = await requireOwnedBrand(userId, id);
  if (isErrorResponse(brand)) return brand;

  await prisma.brand.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
