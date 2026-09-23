import { getImageProvider } from "@/lib/ai";
import { saveImageAndGetUrl } from "@/lib/storage";
import { renderAdTemplate } from "@/lib/ads/template";
import type { ResolvedIntegrationSettings } from "@/lib/integrations";
import type { AdCreative, BrandContext } from "@/lib/ai/types";

export async function generateAdImage(prompt: string, settings: ResolvedIntegrationSettings): Promise<string> {
  const provider = getImageProvider(settings);
  const { base64, mimeType } = await provider.generateImage(prompt);
  const ext = mimeType.includes("png") ? "png" : "jpg";
  return saveImageAndGetUrl({
    base64,
    mimeType,
    filename: `ad-posts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`,
  });
}

/** Renders the branded template (logo, headline, bullets, services, footer) instead of an AI photo. */
export async function generateBrandedAdImage(creative: AdCreative, brand: BrandContext): Promise<string> {
  const { base64, mimeType } = await renderAdTemplate({
    brandName: brand.name ?? "Your Brand",
    logoUrl: brand.logoUrl,
    websiteUrl: brand.websiteUrl,
    creative,
  });
  return saveImageAndGetUrl({
    base64,
    mimeType,
    filename: `ad-posts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`,
  });
}
