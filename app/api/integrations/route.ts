import { NextResponse } from "next/server";
import { z } from "zod";
import { isErrorResponse, requireUserId } from "@/lib/api-helpers";
import { getIntegrationStatus, updateIntegrationSettings } from "@/lib/integrations";

const updateSchema = z.object({
  aiTextProvider: z.enum(["gemini", "openai"]).optional(),
  aiImageProvider: z.enum(["gemini", "openai", "pollinations"]).optional(),
  geminiApiKey: z.string().optional(),
  geminiTextModel: z.string().optional(),
  geminiImageModel: z.string().optional(),
  openaiApiKey: z.string().optional(),
  openaiTextModel: z.string().optional(),
  firecrawlApiKey: z.string().optional(),
  metaAppId: z.string().optional(),
  metaAppSecret: z.string().optional(),
  metaConfigId: z.string().optional(),
  instagramAppId: z.string().optional(),
  instagramAppSecret: z.string().optional(),
  linkedinClientId: z.string().optional(),
  linkedinClientSecret: z.string().optional(),
});

export async function GET() {
  const userId = await requireUserId();
  if (isErrorResponse(userId)) return userId;

  const status = await getIntegrationStatus(userId);
  return NextResponse.json({ status });
}

export async function PATCH(request: Request) {
  const userId = await requireUserId();
  if (isErrorResponse(userId)) return userId;

  const body = updateSchema.parse(await request.json());
  await updateIntegrationSettings(userId, body);
  const status = await getIntegrationStatus(userId);
  return NextResponse.json({ status });
}
