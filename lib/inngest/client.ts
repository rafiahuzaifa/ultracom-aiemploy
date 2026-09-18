import { EventSchemas, Inngest } from "inngest";

type Events = {
  "agent/run.requested": {
    data: { userId: string; websiteId?: string | null; trigger: "manual" | "schedule" };
  };
  "post/approved": {
    data: { postId: string };
  };
  "post/regenerate.requested": {
    data: { postId: string };
  };
};

export const inngest = new Inngest({
  id: "signalforge",
  schemas: new EventSchemas().fromRecord<Events>(),
});
