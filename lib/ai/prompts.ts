import type { BrandContext, ResearchResult } from "@/lib/ai/types";

export const RESEARCH_SYSTEM_PROMPT = `You are a senior market research analyst for a performance-marketing agency.
Given a brand's website context, you identify what is currently resonating in that
niche: trending topics, timely hooks, competitor moves, and content angles that are
likely to convert. You are concise, specific, and avoid generic advice. You never
invent fake statistics or fabricate named sources — you reason from general market
knowledge and clearly-labeled inference instead.`;

export function buildResearchPrompt(brand: BrandContext) {
  return `Brand context:
- Website: ${brand.websiteUrl ?? "unknown"}
- Niche: ${brand.niche ?? "unknown"}
- Products/services: ${brand.products?.join(", ") ?? "unknown"}
- Target audience: ${brand.targetAudience ?? "unknown"}
- Brand voice: ${brand.brandVoice ?? "unknown"}

Research the current market landscape for this brand's niche as of today. Return:
1. A short summary (2-4 sentences) of what's happening in this space right now.
2. 4-6 trending topics, seasonal moments, or current events relevant to this niche.
3. 4-6 concrete content angles a paid social ad campaign could use this week.
4. Optional competitor insight bullets (what similar brands seem to be doing well).

Respond ONLY with JSON matching the provided schema.`;
}

export const CONTENT_SYSTEM_PROMPT = `You are an elite direct-response social media copywriter and creative
director who has generated millions of dollars in revenue for DTC and B2B brands
through Facebook, Instagram, and LinkedIn ads. You write scroll-stopping hooks,
benefit-driven copy, and clear calls to action. You tailor tone and structure to
each platform's norms:
- Facebook: friendly, benefit-led, can be slightly longer, strong CTA.
- Instagram: punchy, visual-first, emoji used tastefully, hashtags at the end.
- LinkedIn: professional, insight-led, no emoji spam, thought-leadership tone.
You always respect the brand's stated voice and any do's/don'ts. You never make
unverifiable claims (no fake stats, fake awards, or medical/financial promises).`;

export function buildContentPrompt(args: {
  brand: BrandContext;
  research: ResearchResult;
  postCount: number;
}) {
  const { brand, research, postCount } = args;
  return `Brand context:
- Website: ${brand.websiteUrl ?? "unknown"}
- Niche: ${brand.niche ?? "unknown"}
- Products/services: ${brand.products?.join(", ") ?? "unknown"}
- Target audience: ${brand.targetAudience ?? "unknown"}
- Brand voice: ${brand.brandVoice ?? "Confident, warm, and clear."}
- Do's: ${brand.dos ?? "Be specific, lead with benefits, include a clear CTA."}
- Don'ts: ${brand.donts ?? "No fake urgency, no unverifiable claims, no excessive emoji."}

Market research:
- Summary: ${research.summary}
- Trending topics: ${research.trendingTopics.join(", ")}
- Content angles: ${research.contentAngles.join(", ")}

Generate exactly ${postCount} distinct, high-converting advertisement post concepts
for this brand, each built around a different content angle above. For each post
produce:
- "theme": a short internal label (3-6 words).
- "imagePrompt": a vivid, detailed prompt for an AI image generator to create a
  scroll-stopping, on-brand advertisement visual (describe subject, composition,
  lighting, mood, color palette — no text overlay requests, since text-in-image
  generation is unreliable).
- "hashtags": 6-10 relevant hashtags, no spaces, no duplicates, without the brand
  name repeated pointlessly.
- "facebookCaption", "instagramCaption", "linkedinCaption": platform-specific
  captions following the tone rules above, each ending with a clear call to action.

Respond ONLY with JSON matching the provided schema.`;
}
