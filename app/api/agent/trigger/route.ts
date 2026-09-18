import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";
import { isErrorResponse, requireUserId } from "@/lib/api-helpers";

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (isErrorResponse(userId)) return userId;

  const body = await request.json().catch(() => ({}));
  const websiteId = typeof body?.websiteId === "string" ? body.websiteId : undefined;

  await inngest.send({
    name: "agent/run.requested",
    data: { userId, websiteId, trigger: "manual" },
  });

  return NextResponse.json({ ok: true });
}
