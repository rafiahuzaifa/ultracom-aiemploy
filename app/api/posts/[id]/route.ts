import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { inngest } from "@/lib/inngest/client";
import { isErrorResponse, requireUserId } from "@/lib/api-helpers";

const patchSchema = z.object({
  action: z.enum(["approve", "reject", "regenerate", "edit"]),
  rejectionReason: z.string().optional(),
  facebookCaption: z.string().optional(),
  instagramCaption: z.string().optional(),
  linkedinCaption: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  platforms: z.array(z.enum(["FACEBOOK", "INSTAGRAM", "LINKEDIN"])).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isErrorResponse(userId)) return userId;
  const { id } = await params;

  const post = await prisma.generatedPost.findFirst({ where: { id, userId } });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const body = patchSchema.parse(await request.json());

  switch (body.action) {
    case "edit": {
      const updated = await prisma.generatedPost.update({
        where: { id },
        data: {
          facebookCaption: body.facebookCaption ?? post.facebookCaption,
          instagramCaption: body.instagramCaption ?? post.instagramCaption,
          linkedinCaption: body.linkedinCaption ?? post.linkedinCaption,
          hashtags: body.hashtags ?? post.hashtags,
          platforms: body.platforms ?? post.platforms,
        },
      });
      return NextResponse.json({ post: updated });
    }
    case "approve": {
      const updated = await prisma.generatedPost.update({
        where: { id },
        data: { status: "APPROVED", approvedAt: new Date() },
      });
      await inngest.send({ name: "post/approved", data: { postId: id } });
      return NextResponse.json({ post: updated });
    }
    case "reject": {
      const updated = await prisma.generatedPost.update({
        where: { id },
        data: { status: "REJECTED", rejectionReason: body.rejectionReason ?? null },
      });
      return NextResponse.json({ post: updated });
    }
    case "regenerate": {
      const updated = await prisma.generatedPost.update({
        where: { id },
        data: { status: "REGENERATING" },
      });
      await inngest.send({ name: "post/regenerate.requested", data: { postId: id } });
      return NextResponse.json({ post: updated });
    }
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isErrorResponse(userId)) return userId;
  const { id } = await params;

  const post = await prisma.generatedPost.findFirst({ where: { id, userId } });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  await prisma.generatedPost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
