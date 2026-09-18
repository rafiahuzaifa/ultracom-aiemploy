import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/db";

/**
 * Runs hourly and fans out `agent/run.requested` events to every user whose
 * configured `frequencyHours` has elapsed since their last run. This makes
 * the "every 6 hours or configurable" requirement per-user instead of a
 * single fixed global cron.
 */
export const agentScheduler = inngest.createFunction(
  { id: "agent-scheduler" },
  { cron: "0 * * * *" },
  async ({ step }) => {
    const dueSettings = await step.run("find-due-users", async () => {
      const all = await prisma.agentSettings.findMany({ where: { isActive: true } });
      const now = Date.now();
      return all.filter((s) => {
        if (!s.lastRunAt) return true;
        const elapsedHours = (now - s.lastRunAt.getTime()) / 3_600_000;
        return elapsedHours >= s.frequencyHours;
      });
    });

    if (dueSettings.length === 0) return { queued: 0 };

    await step.sendEvent(
      "queue-agent-runs",
      dueSettings.map((s) => ({
        name: "agent/run.requested" as const,
        data: { userId: s.userId, trigger: "schedule" as const },
      }))
    );

    return { queued: dueSettings.length };
  }
);
