import { decrypt } from "@/lib/encryption";
import { publishToFacebook } from "@/lib/social/facebook";
import { publishToInstagram } from "@/lib/social/instagram";
import { publishToLinkedIn } from "@/lib/social/linkedin";
import type { Platform, PublishResult } from "@/lib/social/types";
import type { SocialAccount, GeneratedPost } from "@prisma/client";

const CAPTION_BY_PLATFORM: Record<Platform, keyof GeneratedPost> = {
  FACEBOOK: "facebookCaption",
  INSTAGRAM: "instagramCaption",
  LINKEDIN: "linkedinCaption",
};

const PUBLISHERS: Record<
  Platform,
  (input: Parameters<typeof publishToFacebook>[0]) => Promise<PublishResult>
> = {
  FACEBOOK: publishToFacebook,
  INSTAGRAM: publishToInstagram,
  LINKEDIN: publishToLinkedIn,
};

export async function publishPostToPlatforms(args: {
  post: GeneratedPost;
  accounts: SocialAccount[];
}): Promise<PublishResult[]> {
  const { post, accounts } = args;
  if (!post.imageUrl) {
    throw new Error("Post has no image to publish.");
  }

  const platforms = post.platforms as Platform[];
  const results: PublishResult[] = [];

  for (const platform of platforms) {
    const account = accounts.find((a) => a.platform === platform && a.isActive);
    if (!account) {
      results.push({ platform, success: false, error: `No connected ${platform} account.` });
      continue;
    }

    const captionField = CAPTION_BY_PLATFORM[platform];
    const caption = (post[captionField] as string | null) ?? "";
    const publisher = PUBLISHERS[platform];

    const result = await publisher({
      imageUrl: post.imageUrl,
      caption,
      accessToken: decrypt(account.accessToken),
      accountId: account.accountId,
      metadata: account.metadata as Record<string, unknown> | null,
    });
    results.push(result);
  }

  return results;
}
