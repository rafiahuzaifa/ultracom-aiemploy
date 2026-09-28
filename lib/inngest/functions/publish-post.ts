import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/db";
import { publishPostToPlatforms } from "@/lib/social/publish";
import { notifyUser } from "@/lib/notify";
import type { GeneratedPost, PostMedia, SocialAccount } from "@prisma/client";
import type { Platform, PublishResult } from "@/lib/social/types";

export const publishPost = inngest.createFunction(
  { id: "publish-post", retries: 3 },
  { event: "post/approved" },
  async ({ event, step }) => {
    const { postId } = event.data;

    const post = await step.run("load-post", () =>
      prisma.generatedPost.findUniqueOrThrow({
        where: { id: postId },
        include: { media: { orderBy: { order: "asc" } }, brand: true },
      })
    );

    await step.run("mark-publishing", () =>
      prisma.generatedPost.update({ where: { id: postId }, data: { status: "PUBLISHING" } })
    );

    // Only accounts connected to THIS post's brand are ever eligible — a
    // post generated for brand A can never publish to brand B's pages.
    const accounts = await step.run("load-accounts", () =>
      prisma.socialAccount.findMany({ where: { brandId: post.brandId, isActive: true } })
    );

    // On a retry (post already has publishResults from a prior attempt),
    // only re-attempt platforms that didn't already succeed — otherwise a
    // retry would post a second, duplicate copy to a platform that worked
    // the first time.
    const previousResults = (post.publishResults as unknown as PublishResult[] | null) ?? null;
    const platformsToAttempt = previousResults
      ? (post.platforms as Platform[]).filter((p) => !previousResults.find((r) => r.platform === p && r.success))
      : undefined;

    // Inngest types step.run's return as its JSON-serialized shape (Date ->
    // string) since step output is replayed from stored history; the
    // publish logic never reads date fields, so the cast back is safe.
    const newResults = await step.run("publish-to-platforms", () =>
      publishPostToPlatforms({
        post: post as unknown as GeneratedPost & { media: PostMedia[] },
        accounts: accounts as unknown as SocialAccount[],
        onlyPlatforms: platformsToAttempt,
      })
    );

    // Merge: a platform that already succeeded keeps its original result;
    // every platform just attempted takes its fresh result.
    const results: PublishResult[] = (post.platforms as Platform[]).map((p) => {
      const fresh = newResults.find((r) => r.platform === p);
      if (fresh) return fresh;
      return previousResults?.find((r) => r.platform === p) ?? { platform: p, success: false, error: "Not attempted" };
    });

    const anySuccess = results.some((r) => r.success);
    const allSuccess = results.every((r) => r.success);

    await step.run("record-results", () =>
      prisma.generatedPost.update({
        where: { id: postId },
        data: {
          status: allSuccess ? "PUBLISHED" : anySuccess ? "PUBLISHED" : "FAILED",
          publishedAt: anySuccess ? new Date() : undefined,
          publishResults: results as unknown as object,
        },
      })
    );

    await step.run("notify-result", () =>
      notifyUser({
        userId: post.brand.userId,
        title: allSuccess
          ? `Post published to all platforms — ${post.brand.name}`
          : anySuccess
            ? `Post partially published (${post.brand.name}) — some platforms failed`
            : `Post failed to publish — ${post.brand.name}`,
        body: results
          .map((r) => `${r.platform}: ${r.success ? "success" : r.error}`)
          .join(" · "),
        href: "/history",
      })
    );

    return { results };
  }
);
