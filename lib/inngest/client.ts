import { EventSchemas, Inngest } from "inngest";

type Events = {
  "agent/run.requested": {
    data: { brandId: string; trigger: "manual" | "schedule" };
  };
  "post/approved": {
    data: { postId: string };
  };
  "post/regenerate.requested": {
    data: { postId: string };
  };
};

export const inngest = new Inngest({
  id: "autopost-ai",
  schemas: new EventSchemas().fromRecord<Events>(),
});
