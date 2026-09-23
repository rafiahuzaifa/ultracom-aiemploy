import { getTextProvider } from "@/lib/ai";
import { buildContentPrompt, CONTENT_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import type { BrandContext, ContentPostType, GeneratedPostDraft, ResearchResult } from "@/lib/ai/types";
import type { ResolvedIntegrationSettings } from "@/lib/integrations";

const LOCALIZED_SCHEMA = {
  type: "object",
  properties: {
    en: { type: "string" },
    ur: { type: "string" },
  },
};

const CAPTIONS_SCHEMA = {
  type: "object",
  properties: {
    facebook: LOCALIZED_SCHEMA,
    instagram: LOCALIZED_SCHEMA,
    linkedin: LOCALIZED_SCHEMA,
  },
  required: ["facebook", "instagram", "linkedin"],
};

const ICON_ENUM = [
  "globe",
  "settings",
  "cloud",
  "users",
  "shield",
  "trending-up",
  "bar-chart",
  "check",
  "wifi",
  "headset",
  "zap",
  "lock",
];

const BULLET_SCHEMA = {
  type: "object",
  properties: {
    icon: { type: "string", enum: ICON_ENUM },
    title: { type: "string" },
    subtitle: { type: "string" },
  },
  required: ["icon", "title", "subtitle"],
};

const SERVICE_SCHEMA = {
  type: "object",
  properties: {
    icon: { type: "string", enum: ICON_ENUM },
    label: { type: "string" },
    subtitle: { type: "string" },
  },
  required: ["icon", "label", "subtitle"],
};

const AD_CREATIVE_SCHEMA = {
  type: "object",
  properties: {
    headlineLines: { type: "array", items: { type: "string" } },
    headlineEmphasisLines: { type: "integer" },
    subheadline: { type: "string" },
    bullets: { type: "array", items: BULLET_SCHEMA },
    services: { type: "array", items: SERVICE_SCHEMA },
  },
  required: ["headlineLines", "headlineEmphasisLines", "subheadline", "bullets", "services"],
};

const SLIDE_SCHEMA = {
  type: "object",
  properties: {
    order: { type: "integer" },
    imagePrompt: { type: "string" },
    caption: LOCALIZED_SCHEMA,
  },
  required: ["order", "imagePrompt", "caption"],
};

const REEL_SCENE_SCHEMA = {
  type: "object",
  properties: {
    description: { type: "string" },
    visual: { type: "string" },
    durationSeconds: { type: "integer" },
  },
  required: ["description", "visual", "durationSeconds"],
};

const REEL_SCRIPT_SCHEMA = {
  type: "object",
  properties: {
    hook: { type: "string" },
    fullScript: { type: "string" },
    scenes: { type: "array", items: REEL_SCENE_SCHEMA },
  },
  required: ["hook", "fullScript", "scenes"],
};

const POST_SCHEMA = {
  type: "object",
  properties: {
    theme: { type: "string" },
    hashtags: { type: "array", items: { type: "string" } },
    captions: CAPTIONS_SCHEMA,
    imagePrompt: { type: "string" },
    adCreative: AD_CREATIVE_SCHEMA,
    slides: { type: "array", items: SLIDE_SCHEMA },
    reelScript: REEL_SCRIPT_SCHEMA,
  },
  required: ["theme", "hashtags", "captions", "imagePrompt"],
};

/**
 * Defends against models occasionally concatenating multiple hashtags into
 * one array item (e.g. "#foo#bar") instead of separate elements.
 */
function normalizeHashtags(hashtags: string[]): string[] {
  const split = hashtags.flatMap((tag) =>
    tag
      .split("#")
      .map((t) => t.trim())
      .filter(Boolean)
  );
  return Array.from(new Set(split)).slice(0, 10);
}

/** Generates a single post concept of the given type (image / carousel / reel). */
export async function generateAdPost(args: {
  brand: BrandContext;
  research: ResearchResult;
  postType: ContentPostType;
  theme?: string;
  settings: ResolvedIntegrationSettings;
}): Promise<GeneratedPostDraft> {
  const provider = getTextProvider(args.settings);
  const raw = await provider.generateJSON<Omit<GeneratedPostDraft, "postType">>({
    system: CONTENT_SYSTEM_PROMPT,
    prompt: buildContentPrompt(args),
    schema: POST_SCHEMA,
  });

  const draft: GeneratedPostDraft = { ...raw, postType: args.postType, hashtags: normalizeHashtags(raw.hashtags) };

  if (args.postType === "CAROUSEL") {
    draft.slides = (raw.slides ?? [])
      .slice(0, 5)
      .sort((a, b) => a.order - b.order);
  } else {
    delete draft.slides;
  }

  if (args.postType !== "REEL") {
    delete draft.reelScript;
  }

  if (args.postType === "IMAGE" && draft.adCreative) {
    draft.adCreative.bullets = draft.adCreative.bullets.slice(0, 3);
    draft.adCreative.services = draft.adCreative.services.slice(0, 5);
    draft.adCreative.headlineLines = draft.adCreative.headlineLines.slice(0, 4);
  } else {
    delete draft.adCreative;
  }

  return draft;
}
