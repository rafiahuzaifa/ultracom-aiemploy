import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { analyzeWebsite } from "@/lib/website/analyze";
import { isErrorResponse, requireUserId } from "@/lib/api-helpers";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isErrorResponse(userId)) return userId;
  const { id } = await params;

  const website = await prisma.website.findFirst({ where: { id, userId } });
  if (!website) return NextResponse.json({ error: "Website not found" }, { status: 404 });

  try {
    const analysis = await analyzeWebsite(website.url);
    const updated = await prisma.website.update({
      where: { id },
      data: {
        niche: analysis.niche,
        products: analysis.products,
        targetAudience: analysis.targetAudience,
        brandVoice: analysis.brandVoice,
        analysis: analysis as unknown as object,
        analyzedAt: new Date(),
      },
    });
    return NextResponse.json({ website: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
