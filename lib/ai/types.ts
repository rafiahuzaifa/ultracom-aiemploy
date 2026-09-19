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

export interface BrandContext {
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
  /** IMAGE: the single creative. CAROUSEL/REEL: cover/thumbnail image prompt. */
  imagePrompt: string;
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
