export interface BrandContext {
  websiteUrl?: string;
  niche?: string;
  products?: string[];
  targetAudience?: string;
  brandVoice?: string;
  dos?: string;
  donts?: string;
}

export interface ResearchResult {
  summary: string;
  trendingTopics: string[];
  contentAngles: string[];
  competitorInsights?: string[];
}

export interface GeneratedPostDraft {
  theme: string;
  imagePrompt: string;
  hashtags: string[];
  facebookCaption: string;
  instagramCaption: string;
  linkedinCaption: string;
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
