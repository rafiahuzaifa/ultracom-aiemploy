import { prisma } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";

export interface ResolvedIntegrationSettings {
  aiTextProvider: string;
  aiImageProvider: string;
  geminiApiKey?: string;
  geminiTextModel: string;
  geminiImageModel: string;
  openaiApiKey?: string;
  openaiTextModel: string;
  firecrawlApiKey?: string;
  metaAppId?: string;
  metaAppSecret?: string;
  metaConfigId?: string;
  instagramAppId?: string;
  instagramAppSecret?: string;
  linkedinClientId?: string;
  linkedinClientSecret?: string;
}

function tryDecrypt(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return decrypt(value);
  } catch {
    // A value saved under a since-rotated ENCRYPTION_KEY — treat as unset
    // rather than crashing the whole request.
    return undefined;
  }
}

/**
 * Resolves this user's integration credentials: whatever they've saved on
 * the Integrations page, falling back to the matching environment variable
 * for anything left blank. This is the single place every AI provider,
 * website analyzer, and social OAuth route reads credentials from — none of
 * them read process.env directly anymore.
 */
export async function getIntegrationSettings(userId: string): Promise<ResolvedIntegrationSettings> {
  const row = await prisma.integrationSettings.findUnique({ where: { userId } });

  return {
    aiTextProvider: row?.aiTextProvider || process.env.AI_TEXT_PROVIDER || "gemini",
    aiImageProvider: row?.aiImageProvider || process.env.AI_IMAGE_PROVIDER || "pollinations",
    geminiApiKey: tryDecrypt(row?.geminiApiKey) || process.env.GEMINI_API_KEY,
    geminiTextModel: row?.geminiTextModel || process.env.GEMINI_TEXT_MODEL || "gemini-3.6-flash",
    geminiImageModel: row?.geminiImageModel || process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image",
    openaiApiKey: tryDecrypt(row?.openaiApiKey) || process.env.OPENAI_API_KEY,
    openaiTextModel: row?.openaiTextModel || process.env.OPENAI_TEXT_MODEL || "gpt-4o",
    firecrawlApiKey: tryDecrypt(row?.firecrawlApiKey) || process.env.FIRECRAWL_API_KEY,
    metaAppId: row?.metaAppId || process.env.META_APP_ID,
    metaAppSecret: tryDecrypt(row?.metaAppSecret) || process.env.META_APP_SECRET,
    metaConfigId: row?.metaConfigId || process.env.META_CONFIG_ID,
    instagramAppId: row?.instagramAppId || process.env.INSTAGRAM_APP_ID,
    instagramAppSecret: tryDecrypt(row?.instagramAppSecret) || process.env.INSTAGRAM_APP_SECRET,
    linkedinClientId: row?.linkedinClientId || process.env.LINKEDIN_CLIENT_ID,
    linkedinClientSecret: tryDecrypt(row?.linkedinClientSecret) || process.env.LINKEDIN_CLIENT_SECRET,
  };
}

/** Which secret fields currently have a value, without ever exposing the value itself to the client. */
export async function getIntegrationStatus(userId: string) {
  const settings = await getIntegrationSettings(userId);
  return {
    aiTextProvider: settings.aiTextProvider,
    aiImageProvider: settings.aiImageProvider,
    geminiTextModel: settings.geminiTextModel,
    geminiImageModel: settings.geminiImageModel,
    openaiTextModel: settings.openaiTextModel,
    metaAppId: settings.metaAppId ?? "",
    metaConfigId: settings.metaConfigId ?? "",
    instagramAppId: settings.instagramAppId ?? "",
    linkedinClientId: settings.linkedinClientId ?? "",
    hasGeminiApiKey: Boolean(settings.geminiApiKey),
    hasOpenaiApiKey: Boolean(settings.openaiApiKey),
    hasFirecrawlApiKey: Boolean(settings.firecrawlApiKey),
    hasMetaAppSecret: Boolean(settings.metaAppSecret),
    hasInstagramAppSecret: Boolean(settings.instagramAppSecret),
    hasLinkedinClientSecret: Boolean(settings.linkedinClientSecret),
  };
}

const SECRET_FIELDS = [
  "geminiApiKey",
  "openaiApiKey",
  "firecrawlApiKey",
  "metaAppSecret",
  "instagramAppSecret",
  "linkedinClientSecret",
] as const;

const PLAIN_FIELDS = [
  "aiTextProvider",
  "aiImageProvider",
  "geminiTextModel",
  "geminiImageModel",
  "openaiTextModel",
  "metaAppId",
  "metaConfigId",
  "instagramAppId",
  "linkedinClientId",
] as const;

export type IntegrationUpdateInput = Partial<
  Record<(typeof SECRET_FIELDS)[number] | (typeof PLAIN_FIELDS)[number], string>
>;

/**
 * Saves whatever fields are provided. An empty string clears a field back
 * to the .env fallback; a field left out of the payload entirely is
 * untouched — so the UI never has to round-trip a decrypted secret just to
 * leave it unchanged.
 */
export async function updateIntegrationSettings(userId: string, input: IntegrationUpdateInput) {
  const data: Record<string, string | null> = {};

  for (const field of PLAIN_FIELDS) {
    if (input[field] !== undefined) data[field] = input[field] || null;
  }
  for (const field of SECRET_FIELDS) {
    if (input[field] !== undefined) {
      data[field] = input[field] ? encrypt(input[field]) : null;
    }
  }

  await prisma.integrationSettings.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}
