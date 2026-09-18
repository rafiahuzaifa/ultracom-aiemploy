import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/db";
import { notifyUser } from "@/lib/notify";
import {
  buildBrandContext,
  persistGeneratedPost,
  runContentPhase,
  runImagePhase,
  runResearchPhase,
} from "@/lib/agent/workflow";

export const agentRun = inngest.createFunction(
  { id: "agent-run", retries: 2 },
  { event: "agent/run.requested" },
  async ({ event, step }) => {
    const { userId, websiteId, trigger } = event.data;

    const { brand, website, settings } = await step.run("load-context", () =>
      buildBrandContext(userId, websiteId)
    );

    const agentRunRecord = await step.run("create-run-record", () =>
      prisma.agentRun.create({
        data: {
          userId,
          websiteId: website?.id,
          trigger,
          steps: [{ step: "started", at: new Date().toISOString() }],
        },
      })
    );

    try {
      const research = await step.run("market-research", () => runResearchPhase(brand));

      const postCount = settings?.postsPerRun ?? 2;
      const content = await step.run("generate-content", () =>
        runContentPhase(brand, research, postCount)
      );

      const createdPosts = [];
      for (const [index, draft] of content.posts.entries()) {
        const imageUrl = await step.run(`generate-image-${index}`, () =>
          runImagePhase(draft.imagePrompt)
        );
        const post = await step.run(`persist-post-${index}`, () =>
          persistGeneratedPost({
            userId,
            websiteId: website?.id,
            agentRunId: agentRunRecord.id,
            researchSummary: research.summary,
            draft,
            imageUrl,
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
              { step: "content", at: new Date().toISOString(), detail: `${createdPosts.length} posts drafted` },
              { step: "completed", at: new Date().toISOString() },
            ],
          },
        })
      );

      await step.run("update-last-run", () =>
        prisma.agentSettings.update({
          where: { userId },
          data: { lastRunAt: new Date() },
        })
      );

      if (settings?.notifyOnReady && createdPosts.length > 0) {
        await step.run("notify-user", () =>
          notifyUser({
            userId,
            title: `${createdPosts.length} new ad post${createdPosts.length > 1 ? "s" : ""} ready for review`,
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
