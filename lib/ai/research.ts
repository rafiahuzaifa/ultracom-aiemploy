import { getTextProvider } from "@/lib/ai";
import { buildResearchPrompt, RESEARCH_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import type { BrandContext, ResearchResult } from "@/lib/ai/types";

const RESEARCH_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    trendingTopics: { type: "array", items: { type: "string" } },
    contentAngles: { type: "array", items: { type: "string" } },
    competitorInsights: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "trendingTopics", "contentAngles"],
};

export async function runMarketResearch(brand: BrandContext): Promise<ResearchResult> {
  const provider = getTextProvider();
  return provider.generateJSON<ResearchResult>({
    system: RESEARCH_SYSTEM_PROMPT,
    prompt: buildResearchPrompt(brand),
    schema: RESEARCH_SCHEMA,
  });
}
