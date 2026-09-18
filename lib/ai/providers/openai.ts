import OpenAI from "openai";
import type { ImageProvider, TextProvider } from "@/lib/ai/types";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set.");
    client = new OpenAI({ apiKey });
  }
  return client;
}

/** Text + JSON structured-output provider backed by OpenAI GPT-4o. */
export const openaiTextProvider: TextProvider = {
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
    const model = process.env.OPENAI_TEXT_MODEL || "gpt-4o";
    const completion = await getClient().chat.completions.create({
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

/** Image generation provider backed by OpenAI DALL·E 3. */
export const openaiImageProvider: ImageProvider = {
  name: "openai",
  async generateImage(prompt: string) {
    const result = await getClient().images.generate({
      model: "dall-e-3",
      prompt,
      size: "1024x1024",
      quality: "hd",
      response_format: "b64_json",
      n: 1,
    });
    const base64 = result.data?.[0]?.b64_json;
    if (!base64) throw new Error("OpenAI returned no image data.");
    return { base64, mimeType: "image/png" };
  },
};
