import type { ImageProvider, TextProvider } from "@/lib/ai/types";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

function requireKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set.");
  return key;
}

/** Text + JSON structured-output provider backed by Gemini. */
export const geminiTextProvider: TextProvider = {
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
    const model = process.env.GEMINI_TEXT_MODEL || "gemini-2.0-flash";
    const res = await fetch(
      `${API_BASE}/models/${model}:generateContent?key=${requireKey()}`,
      {
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
      }
    );

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

/** Image generation provider backed by Google Imagen 3 (via the Gemini API). */
export const geminiImageProvider: ImageProvider = {
  name: "gemini",
  async generateImage(prompt: string) {
    const model = process.env.GEMINI_IMAGE_MODEL || "imagen-3.0-generate-002";
    const res = await fetch(
      `${API_BASE}/models/${model}:predict?key=${requireKey()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1, aspectRatio: "1:1" },
        }),
      }
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Gemini image generation failed (${res.status}): ${body}`);
    }

    const data = await res.json();
    const prediction = data?.predictions?.[0];
    const base64: string | undefined = prediction?.bytesBase64Encoded;
    if (!base64) throw new Error("Gemini returned no image data.");
    return { base64, mimeType: prediction?.mimeType || "image/png" };
  },
};
