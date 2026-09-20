import OpenAI from "openai";
import type { ImageProvider, TextProvider } from "@/lib/ai/types";

/** Text + JSON structured-output provider backed by OpenAI GPT-4o. */
export function createOpenAITextProvider(apiKey: string, model = "gpt-4o"): TextProvider {
  const client = new OpenAI({ apiKey });
  return {
    name: "openai",
    async generateJSON<T>({
      system,
      prompt,
      schema,
    }: {
      system: string;
      prompt: string;
      schema: Record<string, unknown>;
    }): Promise<T> {
      const completion = await client.chat.completions.create({
        model,
        temperature: 0.9,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "response", schema, strict: false },
        },
      });
      const text = completion.choices[0]?.message?.content;
      if (!text) throw new Error("OpenAI returned no content.");
      return JSON.parse(text) as T;
    },
  };
}

/** Image generation provider backed by OpenAI's gpt-image-1 model. */
export function createOpenAIImageProvider(apiKey: string): ImageProvider {
  const client = new OpenAI({ apiKey });
  return {
    name: "openai",
    async generateImage(prompt: string) {
      const result = await client.images.generate({
        model: "gpt-image-1",
        prompt,
        size: "1024x1024",
        quality: "high",
        n: 1,
      });
      const base64 = result.data?.[0]?.b64_json;
      if (!base64) throw new Error("OpenAI returned no image data.");
      return { base64, mimeType: "image/png" };
    },
  };
}
