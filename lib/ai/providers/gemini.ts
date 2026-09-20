import type { ImageProvider, TextProvider } from "@/lib/ai/types";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

/** Text + JSON structured-output provider backed by Gemini. */
export function createGeminiTextProvider(apiKey: string, model = "gemini-3.6-flash"): TextProvider {
  return {
    name: "gemini",
    async generateJSON<T>({
      system,
      prompt,
      schema,
    }: {
      system: string;
      prompt: string;
      schema: Record<string, unknown>;
    }): Promise<T> {
      const res = await fetch(`${API_BASE}/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schema,
            temperature: 0.9,
          },
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Gemini text generation failed (${res.status}): ${body}`);
      }

      const data = await res.json();
      const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Gemini returned no content.");
      return JSON.parse(text) as T;
    },
  };
}

/**
 * Image generation provider backed by Gemini's multimodal image models
 * (e.g. gemini-2.5-flash-image). These generate images through the same
 * generateContent endpoint used for text, returning inline base64 image
 * data in the response parts rather than through a separate predict API.
 */
export function createGeminiImageProvider(apiKey: string, model = "gemini-2.5-flash-image"): ImageProvider {
  return {
    name: "gemini",
    async generateImage(prompt: string) {
      const res = await fetch(`${API_BASE}/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Gemini image generation failed (${res.status}): ${body}`);
      }

      const data = await res.json();
      const parts = data?.candidates?.[0]?.content?.parts ?? [];
      const imagePart = parts.find((p: { inlineData?: { data?: string } }) => p.inlineData?.data);
      const base64: string | undefined = imagePart?.inlineData?.data;
      if (!base64) throw new Error("Gemini returned no image data.");
      return { base64, mimeType: imagePart.inlineData.mimeType || "image/png" };
    },
  };
}
