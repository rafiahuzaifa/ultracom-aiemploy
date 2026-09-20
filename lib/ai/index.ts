import type { ImageProvider, TextProvider } from "@/lib/ai/types";
import type { ResolvedIntegrationSettings } from "@/lib/integrations";
import { createGeminiImageProvider, createGeminiTextProvider } from "@/lib/ai/providers/gemini";
import { createOpenAIImageProvider, createOpenAITextProvider } from "@/lib/ai/providers/openai";
import { pollinationsImageProvider } from "@/lib/ai/providers/pollinations";

/**
 * Provider selection is settings-driven (Integrations page, falling back to
 * env vars) so the agent can move between model vendors — Gemini, OpenAI,
 * and future Anthropic/Grok providers — without touching business logic or
 * requiring a redeploy.
 */
export function getTextProvider(settings: ResolvedIntegrationSettings): TextProvider {
  switch (settings.aiTextProvider.toLowerCase()) {
    case "openai":
      if (!settings.openaiApiKey) throw new Error("OpenAI is selected as the text provider but no API key is configured. Add one on the Integrations page.");
      return createOpenAITextProvider(settings.openaiApiKey, settings.openaiTextModel);
    case "gemini":
    default:
      if (!settings.geminiApiKey) throw new Error("Gemini is selected as the text provider but no API key is configured. Add one on the Integrations page.");
      return createGeminiTextProvider(settings.geminiApiKey, settings.geminiTextModel);
  }
}

export function getImageProvider(settings: ResolvedIntegrationSettings): ImageProvider {
  switch (settings.aiImageProvider.toLowerCase()) {
    case "openai":
      if (!settings.openaiApiKey) throw new Error("OpenAI is selected as the image provider but no API key is configured. Add one on the Integrations page.");
      return createOpenAIImageProvider(settings.openaiApiKey);
    case "gemini":
      if (!settings.geminiApiKey) throw new Error("Gemini is selected as the image provider but no API key is configured. Add one on the Integrations page.");
      return createGeminiImageProvider(settings.geminiApiKey, settings.geminiImageModel);
    case "pollinations":
    default:
      return pollinationsImageProvider;
  }
}
