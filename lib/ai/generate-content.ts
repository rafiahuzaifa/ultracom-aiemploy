import { getTextProvider } from "@/lib/ai";
import { buildContentPrompt, CONTENT_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import type { BrandContext, GeneratedContentResult, ResearchResult } from "@/lib/ai/types";

const POST_SCHEMA = {
  type: "object",
  properties: {
    theme: { type: "string" },
    imagePrompt: { type: "string" },
    hashtags: { type: "array", items: { type: "string" } },
    facebookCaption: { type: "string" },
    instagramCaption: { type: "string" },
    linkedinCaption: { type: "string" },
  },
  required: [
    "theme",
    "imagePrompt",
    "hashtags",
    "facebookCaption",
    "instagramCaption",
    "linkedinCaption",
  ],
};

const CONTENT_SCHEMA = {
  type: "object",
  properties: {
    posts: { type: "array", items: POST_SCHEMA },
  },
  required: ["posts"],
};

export async function generateAdPosts(args: {
  brand: BrandContext;
  research: ResearchResult;
  postCount: number;
}): Promise<GeneratedContentResult> {
  const provider = getTextProvider();
  const result = await provider.generateJSON<GeneratedContentResult>({
    system: CONTENT_SYSTEM_PROMPT,
    prompt: buildContentPrompt(args),
    schema: CONTENT_SCHEMA,
  });
  return { posts: result.posts.slice(0, args.postCount) };
}
