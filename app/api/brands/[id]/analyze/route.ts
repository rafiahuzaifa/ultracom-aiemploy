import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { analyzeWebsite } from "@/lib/brand/analyze";
import { isErrorResponse, requireOwnedBrand, requireUserId } from "@/lib/api-helpers";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isErrorResponse(userId)) return userId;
  const { id } = await params;

  const brand = await requireOwnedBrand(userId, id);
  if (isErrorResponse(brand)) return brand;

  try {
    const analysis = await analyzeWebsite(brand.websiteUrl);
    const updated = await prisma.brand.update({
      where: { id },
      data: {
        niche: analysis.niche,
        products: analysis.products,
        analysis: analysis as unknown as object,
        analyzedAt: new Date(),
      },
    });

    // Seed this brand's profile from its own analysis, but never overwrite
    // fields already customized — analysis only fills in blanks, and never
    // touches any other brand's profile.
    const existingProfile = await prisma.brandProfile.findUnique({ where: { brandId: id } });
    await prisma.brandProfile.upsert({
      where: { brandId: id },
      update: {
        targetAudience: existingProfile?.targetAudience || analysis.targetAudience,
        brandVoice: existingProfile?.brandVoice || analysis.brandVoice,
        uniqueSellingPoints:
          existingProfile?.uniqueSellingPoints && existingProfile.uniqueSellingPoints.length > 0
            ? existingProfile.uniqueSellingPoints
            : analysis.uniqueSellingPoints,
      },
      create: {
        brandId: id,
        targetAudience: analysis.targetAudience,
        brandVoice: analysis.brandVoice,
        uniqueSellingPoints: analysis.uniqueSellingPoints,
      },
    });

    return NextResponse.json({ brand: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
