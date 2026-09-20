import { Prisma } from "@prisma/client";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/db";
import { buildBrandContext, runContentPhase, runImagePhase, runResearchPhase } from "@/lib/agent/workflow";
import type { ContentPostType } from "@/lib/ai/types";

export const regeneratePost = inngest.createFunction(
  { id: "regenerate-post", retries: 2 },
  { event: "post/regenerate.requested" },
  async ({ event, step }) => {
    const { postId } = event.data;

    const existing = await step.run("load-post", () =>
      prisma.generatedPost.findUniqueOrThrow({ where: { id: postId } })
    );

    const { context, integrations } = await step.run("load-context", () => buildBrandContext(existing.brandId));

    const research = await step.run("market-research", () => runResearchPhase(context, integrations));
    const draft = await step.run("generate-content", () =>
      runContentPhase({
        brand: context,
        research,
        postType: existing.postType as ContentPostType,
        theme: existing.theme ?? undefined,
        settings: integrations,
      })
    );

    const { coverImageUrl, slideImages } = await step.run("generate-image", () => runImagePhase(draft, integrations));

    const updated = await step.run("update-post", async () => {
      await prisma.postMedia.deleteMany({ where: { postId } });
      return prisma.generatedPost.update({
        where: { id: postId },
        data: {
          status: "PENDING_APPROVAL",
          theme: draft.theme,
          imagePrompt: draft.imagePrompt,
          imageUrl: coverImageUrl,
          researchSummary: research.summary,
          captions: draft.captions as unknown as object,
          reelScript: draft.reelScript ? (draft.reelScript as unknown as object) : Prisma.JsonNull,
          hashtags: draft.hashtags,
          rejectionReason: null,
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
    });

    return { postId: updated.id };
  }
);
