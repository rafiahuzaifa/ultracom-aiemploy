import { prisma } from "@/lib/db";
import { runMarketResearch } from "@/lib/ai/research";
import { generateAdPost } from "@/lib/ai/generate-content";
import { generateAdImage } from "@/lib/ai/generate-image";
import type { BrandContext, ContentPostType, GeneratedPostDraft } from "@/lib/ai/types";

export async function buildBrandContext(userId: string, websiteId?: string | null) {
  const website = websiteId
    ? await prisma.website.findFirst({ where: { id: websiteId, userId } })
    : await prisma.website.findFirst({ where: { userId }, orderBy: { isPrimary: "desc" } });

  const [profile, settings] = await Promise.all([
    prisma.brandProfile.findUnique({ where: { userId } }),
    prisma.agentSettings.findUnique({ where: { userId } }),
  ]);

  const analysis = (website?.analysis ?? {}) as Record<string, unknown>;

  const brand: BrandContext = {
    websiteUrl: website?.url,
    niche: website?.niche ?? (analysis.niche as string | undefined),
    products: (website?.products as string[] | null) ?? undefined,
    targetAudience: profile?.targetAudience ?? undefined,
    brandVoice: profile?.brandVoice ?? undefined,
    tone: profile?.tone ?? undefined,
    uniqueSellingPoints: profile?.uniqueSellingPoints ?? undefined,
    languagePreference: profile?.languagePreference ?? "EN",
    contentTypes: (profile?.contentTypes as ContentPostType[] | undefined) ?? ["IMAGE"],
    dos: profile?.dos ?? undefined,
    donts: profile?.donts ?? undefined,
  };

  return { brand, website, settings, profile };
}

export async function runResearchPhase(brand: BrandContext) {
  return runMarketResearch(brand);
}

/** Cycles through the brand's preferred content types so a multi-post run gets variety. */
export function pickPostTypesForRun(
  contentTypes: ContentPostType[] | undefined,
  count: number
): ContentPostType[] {
  const types = contentTypes && contentTypes.length > 0 ? contentTypes : ["IMAGE" as const];
  return Array.from({ length: count }, (_, i) => types[i % types.length]);
}

export async function runContentPhase(args: {
  brand: BrandContext;
  research: Awaited<ReturnType<typeof runResearchPhase>>;
  postType: ContentPostType;
  theme?: string;
}) {
  return generateAdPost(args);
}

/** Generates the image(s) a draft needs: one cover for IMAGE/REEL, one per slide for CAROUSEL. */
export async function runImagePhase(draft: GeneratedPostDraft) {
  if (draft.postType === "CAROUSEL" && draft.slides) {
    const slideImages = await Promise.all(
      draft.slides.map((slide) => generateAdImage(slide.imagePrompt))
    );
    const coverImageUrl = slideImages[0];
    return { coverImageUrl, slideImages };
  }
  const coverImageUrl = await generateAdImage(draft.imagePrompt);
  return { coverImageUrl, slideImages: [] as string[] };
}

export async function persistGeneratedPost(args: {
  userId: string;
  websiteId?: string | null;
  agentRunId: string;
  researchSummary: string;
  draft: GeneratedPostDraft;
  coverImageUrl: string;
  slideImages: string[];
  autoApprove: boolean;
}) {
  const { userId, websiteId, agentRunId, researchSummary, draft, coverImageUrl, slideImages, autoApprove } =
    args;

  return prisma.generatedPost.create({
    data: {
      userId,
      websiteId: websiteId ?? undefined,
      agentRunId,
      status: autoApprove ? "APPROVED" : "PENDING_APPROVAL",
      postType: draft.postType,
      theme: draft.theme,
      imagePrompt: draft.imagePrompt,
      imageUrl: coverImageUrl,
      researchSummary,
      platforms: ["FACEBOOK", "INSTAGRAM", "LINKEDIN"],
      captions: draft.captions as unknown as object,
      reelScript: draft.reelScript ? (draft.reelScript as unknown as object) : undefined,
      hashtags: draft.hashtags,
      approvedAt: autoApprove ? new Date() : null,
      media:
        draft.postType === "CAROUSEL" && draft.slides
          ? {
              create: draft.slides.map((slide, index) => ({
                order: slide.order ?? index,
                imageUrl: slideImages[index],
                imagePrompt: slide.imagePrompt,
                caption: slide.caption as unknown as object,
              })),
            }
          : undefined,
    },
    include: { media: { orderBy: { order: "asc" } } },
  });
}
