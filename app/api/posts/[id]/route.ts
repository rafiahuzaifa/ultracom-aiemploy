import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { inngest } from "@/lib/inngest/client";
import { isErrorResponse, requireUserId } from "@/lib/api-helpers";
import { generateAdImage } from "@/lib/ai/generate-image";

const localizedSchema = z.object({
  en: z.string().optional(),
  ur: z.string().optional(),
});

const patchSchema = z.object({
  action: z.enum(["approve", "reject", "regenerate", "regenerate-image", "edit"]),
  rejectionReason: z.string().optional(),
  captions: z
    .object({
      facebook: localizedSchema.optional(),
      instagram: localizedSchema.optional(),
      linkedin: localizedSchema.optional(),
    })
    .optional(),
  hashtags: z.array(z.string()).optional(),
  platforms: z.array(z.enum(["FACEBOOK", "INSTAGRAM", "LINKEDIN"])).optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isErrorResponse(userId)) return userId;
  const { id } = await params;

  const post = await prisma.generatedPost.findFirst({
    where: { id, brand: { userId } },
    include: { media: { orderBy: { order: "asc" } } },
  });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  return NextResponse.json({ post });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isErrorResponse(userId)) return userId;
  const { id } = await params;

  const post = await prisma.generatedPost.findFirst({
    where: { id, brand: { userId } },
    include: { media: { orderBy: { order: "asc" } } },
  });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const body = patchSchema.parse(await request.json());

  switch (body.action) {
    case "edit": {
      const existingCaptions = (post.captions ?? {}) as Record<string, unknown>;
      const mergedCaptions = body.captions
        ? {
            facebook: { ...(existingCaptions.facebook as object), ...body.captions.facebook },
            instagram: { ...(existingCaptions.instagram as object), ...body.captions.instagram },
            linkedin: { ...(existingCaptions.linkedin as object), ...body.captions.linkedin },
          }
        : existingCaptions;

      const updated = await prisma.generatedPost.update({
        where: { id },
        data: {
          captions: mergedCaptions as object,
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
    case "regenerate-image": {
      // Re-renders the image(s) from the SAME prompt(s) already stored —
      // fast enough to run inline, unlike a full content regeneration.
      if (post.postType === "CAROUSEL" && post.media.length > 0) {
        const newImages = await Promise.all(
          post.media.map((slide) => generateAdImage(slide.imagePrompt ?? post.imagePrompt ?? ""))
        );
        await Promise.all(
          post.media.map((slide, i) =>
            prisma.postMedia.update({ where: { id: slide.id }, data: { imageUrl: newImages[i] } })
          )
        );
        const updated = await prisma.generatedPost.update({
          where: { id },
          data: { imageUrl: newImages[0] },
          include: { media: { orderBy: { order: "asc" } } },
        });
        return NextResponse.json({ post: updated });
      }

      const newImageUrl = await generateAdImage(post.imagePrompt ?? post.theme ?? "");
      const updated = await prisma.generatedPost.update({
        where: { id },
        data: { imageUrl: newImageUrl },
        include: { media: { orderBy: { order: "asc" } } },
      });
      return NextResponse.json({ post: updated });
    }
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isErrorResponse(userId)) return userId;
  const { id } = await params;

  const post = await prisma.generatedPost.findFirst({ where: { id, brand: { userId } } });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  await prisma.generatedPost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
