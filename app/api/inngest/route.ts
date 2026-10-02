import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { functions } from "@/lib/inngest/functions";

// Publishing waits on Instagram media processing, which can take tens of
// seconds — give each step room beyond the platform default.
export const maxDuration = 60;

// Vercel's per-deployment preview URL changes on every deploy and is not
// reachable by Inngest's sync service, so pin the serve host to the stable
// production domain instead of letting the SDK infer it from the request.
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
  serveHost: process.env.NEXT_PUBLIC_APP_URL,
});
