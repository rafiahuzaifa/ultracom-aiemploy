import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/db";
import { notifyUser } from "@/lib/notify";
import {
  buildBrandContext,
  persistGeneratedPost,
  pickPostTypesForRun,
  runContentPhase,
  runImagePhase,
  runResearchPhase,
} from "@/lib/agent/workflow";

export const agentRun = inngest.createFunction(
  { id: "agent-run", retries: 2 },
  { event: "agent/run.requested" },
  async ({ event, step }) => {
    const { brandId, trigger } = event.data;

    const { brand, context, settings, integrations } = await step.run("load-context", () =>
      buildBrandContext(brandId)
    );

    const agentRunRecord = await step.run("create-run-record", () =>
      prisma.agentRun.create({
        data: {
          brandId,
          trigger,
          steps: [{ step: "started", at: new Date().toISOString() }],
        },
      })
    );

    try {
      // Research and content generation only ever see THIS brand's context
      // (niche, voice, audience, USPs) — nothing here is shared or cached
      // across brands, so output for brand A can never bleed into brand B.
      const research = await step.run("market-research", () => runResearchPhase(context, integrations));

      const postCount = settings?.postsPerRun ?? 2;
      const postTypes = pickPostTypesForRun(context.contentTypes, postCount);

      const createdPosts = [];
      for (const [index, postType] of postTypes.entries()) {
        const draft = await step.run(`generate-content-${index}`, () =>
          runContentPhase({ brand: context, research, postType, settings: integrations })
        );

        const { coverImageUrl, slideImages } = await step.run(`generate-image-${index}`, () =>
          runImagePhase(draft, integrations)
        );

        const post = await step.run(`persist-post-${index}`, () =>
          persistGeneratedPost({
            brandId,
            agentRunId: agentRunRecord.id,
            researchSummary: research.summary,
            draft,
            coverImageUrl,
            slideImages,
            autoApprove: settings?.autoApprove ?? false,
          })
        );
        createdPosts.push(post);
      }

      await step.run("finalize-run", () =>
        prisma.agentRun.update({
          where: { id: agentRunRecord.id },
          data: {
            status: "COMPLETED",
            finishedAt: new Date(),
            postsGenerated: createdPosts.length,
            steps: [
              { step: "research", at: new Date().toISOString(), detail: research.summary },
              { step: "content", at: new Date().toISOString(), detail: `${createdPosts.length} posts drafted (${postTypes.join(", ")})` },
              { step: "completed", at: new Date().toISOString() },
            ],
          },
        })
      );

      await step.run("update-last-run", () =>
        prisma.agentSettings.update({
          where: { brandId },
          data: { lastRunAt: new Date() },
        })
      );

      if (settings?.notifyOnReady && createdPosts.length > 0) {
        await step.run("notify-user", () =>
          notifyUser({
            userId: brand.userId,
            title: `${createdPosts.length} new post${createdPosts.length > 1 ? "s" : ""} ready for review — ${brand.name}`,
            body: research.summary,
            href: "/",
          })
        );
      }

      return { runId: agentRunRecord.id, postsGenerated: createdPosts.length };
    } catch (error) {
      await step.run("fail-run", () =>
        prisma.agentRun.update({
          where: { id: agentRunRecord.id },
          data: {
            status: "FAILED",
            finishedAt: new Date(),
            error: error instanceof Error ? error.message : "Unknown agent error",
          },
        })
      );
      throw error;
    }
  }
);
