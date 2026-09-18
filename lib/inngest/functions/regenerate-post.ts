import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/db";
import { buildBrandContext, runContentPhase, runImagePhase, runResearchPhase } from "@/lib/agent/workflow";

export const regeneratePost = inngest.createFunction(
  { id: "regenerate-post", retries: 2 },
  { event: "post/regenerate.requested" },
  async ({ event, step }) => {
    const { postId } = event.data;

    const existing = await step.run("load-post", () =>
      prisma.generatedPost.findUniqueOrThrow({ where: { id: postId } })
    );

    const { brand } = await step.run("load-context", () =>
      buildBrandContext(existing.userId, existing.websiteId)
    );

    const research = await step.run("market-research", () => runResearchPhase(brand));
    const content = await step.run("generate-content", () => runContentPhase(brand, research, 1));
    const draft = content.posts[0];

    const imageUrl = await step.run("generate-image", () => runImagePhase(draft.imagePrompt));

    const updated = await step.run("update-post", () =>
      prisma.generatedPost.update({
        where: { id: postId },
        data: {
          status: "PENDING_APPROVAL",
          theme: draft.theme,
          imagePrompt: draft.imagePrompt,
          imageUrl,
          researchSummary: research.summary,
          facebookCaption: draft.facebookCaption,
          instagramCaption: draft.instagramCaption,
          linkedinCaption: draft.linkedinCaption,
          hashtags: draft.hashtags,
          rejectionReason: null,
        },
      })
    );

    return { postId: updated.id };
  }
);
