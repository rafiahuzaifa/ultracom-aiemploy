import type { BrandContext, ContentPostType, ResearchResult } from "@/lib/ai/types";

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

function languageInstruction(pref: BrandContext["languagePreference"]) {
  switch (pref) {
    case "UR":
      return `Write every caption ONLY in Urdu (native Urdu script, not Roman Urdu). Leave the "en" field of every caption object empty.`;
    case "BOTH":
      return `Write every caption in BOTH English and Urdu: fill in both the "en" field (natural, fluent English) and the "ur" field (natural, fluent Urdu in native script — not a literal translation, but a caption that reads naturally to an Urdu-speaking audience). Keep the core message and CTA consistent across both.`;
    case "EN":
    default:
      return `Write every caption ONLY in English. Leave the "ur" field of every caption object empty.`;
  }
}

function contentTypeInstruction(postType: ContentPostType) {
  switch (postType) {
    case "CAROUSEL":
      return `This post is a CAROUSEL of 3-5 slides. Populate "slides": each slide needs its own "imagePrompt" (visually distinct but on-brand, telling a progressive story or breaking down a list/process) and its own "caption" (short slide-specific text). Also fill the top-level "imagePrompt" with a prompt for slide 1 (used as the cover) and top-level "captions" with the overall post caption/CTA that accompanies the whole carousel.`;
    case "REEL":
      return `This post is an INSTAGRAM REEL concept (no video is rendered — you are writing the creative brief). Populate "reelScript" with: "hook" (the first 1-2 seconds of spoken/on-screen text that stops the scroll), "fullScript" (the complete spoken script/voiceover), and "scenes" (4-8 scene objects, each with "description" of what happens, "visual" describing the shot/on-screen action, and "durationSeconds"). Also fill top-level "imagePrompt" for a cover/thumbnail image and "captions" for the post's caption and CTA.`;
    case "IMAGE":
    default:
      return `This post is a SINGLE IMAGE post. Fill "imagePrompt" with one vivid, detailed prompt for the creative and "captions" with the post caption.`;
  }
}

export const CONTENT_SYSTEM_PROMPT = `You are an elite bilingual (English/Urdu) direct-response social media copywriter
and creative director who has generated millions of dollars in revenue for DTC and
B2B brands through Facebook, Instagram, and LinkedIn ads. You write scroll-stopping
hooks, benefit-driven copy, and clear calls to action. You tailor tone and structure
to each platform's norms:
- Facebook: friendly, benefit-led, can be slightly longer, strong CTA.
- Instagram: punchy, visual-first, emoji used tastefully, hashtags at the end.
- LinkedIn: professional, insight-led, no emoji spam, thought-leadership tone.
When writing Urdu, you write fluent, natural native-script Urdu that a native
speaker would actually post — never a stiff literal translation of the English.
You always respect the brand's stated voice and any do's/don'ts. You never make
unverifiable claims (no fake stats, fake awards, or medical/financial promises).
Image prompts you write describe subject, composition, lighting, mood, and color
palette for an AI image generator — never request text-in-image, since that
renders unreliably. Every request you receive is for exactly ONE specific
brand — you have no memory of, and must never reference or borrow phrasing,
visuals, or themes from, any other brand. Nothing here is generic filler
copy: every caption and image prompt must read as if a strategist who only
works on this one account wrote it, grounded in the specific niche,
products, audience, and USPs given below.`;

export function buildContentPrompt(args: {
  brand: BrandContext;
  research: ResearchResult;
  postType: ContentPostType;
  theme?: string;
}) {
  const { brand, research, postType, theme } = args;
  return `Brand context:
- Website: ${brand.websiteUrl ?? "unknown"}
- Niche: ${brand.niche ?? "unknown"}
- Products/services: ${brand.products?.join(", ") ?? "unknown"}
- Target audience: ${brand.targetAudience ?? "unknown"}
- Brand voice: ${brand.brandVoice ?? "Confident, warm, and clear."}
- Tone: ${brand.tone ?? "Confident and approachable"}
- Unique selling points: ${brand.uniqueSellingPoints?.join(", ") ?? "unknown"}
- Do's: ${brand.dos ?? "Be specific, lead with benefits, include a clear CTA."}
- Don'ts: ${brand.donts ?? "No fake urgency, no unverifiable claims, no excessive emoji."}

Market research:
- Summary: ${research.summary}
- Trending topics: ${research.trendingTopics.join(", ")}
- Content angles: ${research.contentAngles.join(", ")}

${languageInstruction(brand.languagePreference)}

${contentTypeInstruction(postType)}

${theme ? `Build this post around the following content angle: ${theme}` : "Pick the strongest content angle from the research above."}

Also produce:
- "theme": a short internal label (3-6 words) for this post.
- "hashtags": an array of 6-10 SEPARATE string elements, one hashtag per
  array item (e.g. ["handmade", "soycandles", "selfcare"] — never combine
  multiple hashtags into a single string). Each item is one word/phrase with
  no spaces, no "#" prefix, no duplicates, without the brand name repeated
  pointlessly.

Respond ONLY with JSON matching the provided schema. Omit "slides" entirely unless
this is a CAROUSEL, and omit "reelScript" entirely unless this is a REEL.`;
}
