export type LanguagePreference = "EN" | "UR" | "BOTH";
export type ContentPostType = "IMAGE" | "CAROUSEL" | "REEL";

/** A piece of text in one or both supported languages, depending on brand language preference. */
export interface Localized {
  en?: string;
  ur?: string;
}

export interface CaptionSet {
  facebook: Localized;
  instagram: Localized;
  linkedin: Localized;
}

export interface ReelScene {
  description: string;
  visual: string;
  durationSeconds: number;
}

export interface ReelScript {
  hook: string;
  fullScript: string;
  scenes: ReelScene[];
}

export interface CarouselSlideDraft {
  order: number;
  imagePrompt: string;
  caption: Localized;
}

/** Fixed icon vocabulary the branded ad template can render (kept in sync with lib/ads/icons.tsx). */
export type AdIconKey =
  | "globe"
  | "settings"
  | "cloud"
  | "users"
  | "shield"
  | "trending-up"
  | "bar-chart"
  | "check"
  | "wifi"
  | "headset"
  | "zap"
  | "lock";

export interface AdCreativeBullet {
  icon: AdIconKey;
  title: string;
  subtitle: string;
}

export interface AdCreativeService {
  icon: AdIconKey;
  label: string;
  subtitle: string;
}

/** Structured content for the branded template renderer (lib/ads/template.tsx) — used instead of a photo-style imagePrompt for IMAGE posts. */
export interface AdCreative {
  /** 2-4 short lines that stack into the big headline. */
  headlineLines: string[];
  /** How many trailing headlineLines are rendered in the accent color, e.g. 2. */
  headlineEmphasisLines: number;
  subheadline: string;
  bullets: AdCreativeBullet[];
  services: AdCreativeService[];
}

export interface BrandContext {
  name?: string;
  logoUrl?: string;
  websiteUrl?: string;
  niche?: string;
  products?: string[];
  targetAudience?: string;
  brandVoice?: string;
  tone?: string;
  uniqueSellingPoints?: string[];
  languagePreference?: LanguagePreference;
  contentTypes?: ContentPostType[];
  dos?: string;
  donts?: string;
}

export interface ResearchResult {
  summary: string;
  trendingTopics: string[];
  contentAngles: string[];
  competitorInsights?: string[];
}

/** One generated post concept, shape varies by postType. */
export interface GeneratedPostDraft {
  postType: ContentPostType;
  theme: string;
  hashtags: string[];
  captions: CaptionSet;
  /** IMAGE: the single creative. CAROUSEL/REEL: cover/thumbnail image prompt. Unused when adCreative is set. */
  imagePrompt: string;
  /** IMAGE only — structured content for the branded template renderer. */
  adCreative?: AdCreative;
  /** CAROUSEL only. */
  slides?: CarouselSlideDraft[];
  /** REEL only. */
  reelScript?: ReelScript;
}

export interface GeneratedContentResult {
  posts: GeneratedPostDraft[];
}

/** A provider that can produce JSON-structured text completions. */
export interface TextProvider {
  readonly name: string;
  generateJSON<T>(args: {
    system: string;
    prompt: string;
    schema: Record<string, unknown>;
  }): Promise<T>;
}

/** A provider that can produce an image from a text prompt. */
export interface ImageProvider {
  readonly name: string;
  generateImage(prompt: string): Promise<{ base64: string; mimeType: string }>;
}
