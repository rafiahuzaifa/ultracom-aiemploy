import type { ImageProvider } from "@/lib/ai/types";

/**
 * Free, no-API-key image generation via Pollinations.ai. Useful as a
 * zero-cost default/fallback so the agent can generate images without any
 * billing set up on Gemini or OpenAI. Quality and consistency are lower
 * than a paid model, but it requires no signup or payment method at all.
 */
export const pollinationsImageProvider: ImageProvider = {
  name: "pollinations",
  async generateImage(prompt: string) {
    const seed = Math.floor(Math.random() * 1_000_000);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${seed}`;

    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Pollinations image generation failed (${res.status}): ${body}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = res.headers.get("content-type") || "image/jpeg";
    return { base64, mimeType };
  },
};
