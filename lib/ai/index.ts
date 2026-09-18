import type { ImageProvider, TextProvider } from "@/lib/ai/types";
import { geminiImageProvider, geminiTextProvider } from "@/lib/ai/providers/gemini";
import { openaiImageProvider, openaiTextProvider } from "@/lib/ai/providers/openai";
import { pollinationsImageProvider } from "@/lib/ai/providers/pollinations";

/**
 * Provider selection is env-driven so the agent can move between model
 * vendors (Gemini, OpenAI, and future Anthropic/Grok providers) without
 * touching business logic. Defaults to Gemini since that's the key most
 * commonly configured for this project.
 */
export function getTextProvider(): TextProvider {
  const provider = (process.env.AI_TEXT_PROVIDER || "gemini").toLowerCase();
  switch (provider) {
    case "openai":
      return openaiTextProvider;
    case "gemini":
    default:
      return geminiTextProvider;
  }
}

export function getImageProvider(): ImageProvider {
  const provider = (process.env.AI_IMAGE_PROVIDER || "pollinations").toLowerCase();
  switch (provider) {
    case "openai":
      return openaiImageProvider;
    case "gemini":
      return geminiImageProvider;
    case "pollinations":
    default:
      return pollinationsImageProvider;
  }
}
