import { prisma } from "@/lib/db";
import { runMarketResearch } from "@/lib/ai/research";
import { generateAdPosts } from "@/lib/ai/generate-content";
import { generateAdImage } from "@/lib/ai/generate-image";
import type { BrandContext } from "@/lib/ai/types";

export interface AgentRunLogStep {
  step: string;
  at: string;
  detail?: string;
}

/**
 * Runs one full autonomous agent cycle for a user: research -> content
 * generation -> image generation -> persistence as pending-approval posts.
 * Each phase is a plain async function so it can be wrapped in Inngest's
 * `step.run` for independent retries/caching by the caller.
 */
export async function buildBrandContext(userId: string, websiteId?: string | null) {
  const website = websiteId
    ? await prisma.website.findFirst({ where: { id: websiteId, userId } })
    : await prisma.website.findFirst({ where: { userId }, orderBy: { isPrimary: "desc" } });

  const settings = await prisma.agentSettings.findUnique({ where: { userId } });

  const analysis = (website?.analysis ?? {}) as Record<string, unknown>;

  const brand: BrandContext = {
    websiteUrl: website?.url,
    niche: website?.niche ?? (analysis.niche as string | undefined),
    products: (website?.products as string[] | null) ?? undefined,
    targetAudience: website?.targetAudience ?? settings?.targetAudience ?? undefined,
    brandVoice: website?.brandVoice ?? settings?.brandVoice ?? undefined,
    dos: settings?.dos ?? undefined,
    donts: settings?.donts ?? undefined,
  };

  return { brand, website, settings };
}

export async function runResearchPhase(brand: BrandContext) {
  return runMarketResearch(brand);
}

export async function runContentPhase(
  brand: BrandContext,
  research: Awaited<ReturnType<typeof runResearchPhase>>,
  postCount: number
) {
  return generateAdPosts({ brand, research, postCount });
}

export async function runImagePhase(imagePrompt: string) {
  return generateAdImage(imagePrompt);
}

export async function persistGeneratedPost(args: {
  userId: string;
  websiteId?: string | null;
  agentRunId: string;
  researchSummary: string;
  draft: {
    theme: string;
    imagePrompt: string;
    hashtags: string[];
    facebookCaption: string;
    instagramCaption: string;
    linkedinCaption: string;
  };
  imageUrl: string;
  autoApprove: boolean;
}) {
  const { userId, websiteId, agentRunId, researchSummary, draft, imageUrl, autoApprove } = args;
  return prisma.generatedPost.create({
    data: {
      userId,
      websiteId: websiteId ?? undefined,
      agentRunId,
      status: autoApprove ? "APPROVED" : "PENDING_APPROVAL",
      theme: draft.theme,
      imagePrompt: draft.imagePrompt,
      imageUrl,
      researchSummary,
      platforms: ["FACEBOOK", "INSTAGRAM", "LINKEDIN"],
      facebookCaption: draft.facebookCaption,
      instagramCaption: draft.instagramCaption,
      linkedinCaption: draft.linkedinCaption,
      hashtags: draft.hashtags,
      approvedAt: autoApprove ? new Date() : null,
    },
  });
}
