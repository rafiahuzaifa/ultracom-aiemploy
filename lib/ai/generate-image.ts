import { getImageProvider } from "@/lib/ai";
import { saveImageAndGetUrl } from "@/lib/storage";

export async function generateAdImage(prompt: string): Promise<string> {
  const provider = getImageProvider();
  const { base64, mimeType } = await provider.generateImage(prompt);
  const ext = mimeType.includes("png") ? "png" : "jpg";
  return saveImageAndGetUrl({
    base64,
    mimeType,
    filename: `ad-posts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`,
  });
}
