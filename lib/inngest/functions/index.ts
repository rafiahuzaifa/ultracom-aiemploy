import { agentRun } from "@/lib/inngest/functions/agent-run";
import { agentScheduler } from "@/lib/inngest/functions/scheduler";
import { publishPost } from "@/lib/inngest/functions/publish-post";
import { regeneratePost } from "@/lib/inngest/functions/regenerate-post";

export const functions = [agentRun, agentScheduler, publishPost, regeneratePost];
