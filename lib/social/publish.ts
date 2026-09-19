import { decrypt } from "@/lib/encryption";
import { publishToFacebook, publishCarouselToFacebook } from "@/lib/social/facebook";
import { publishToInstagram, publishCarouselToInstagram } from "@/lib/social/instagram";
import { publishToLinkedIn, publishCarouselToLinkedIn } from "@/lib/social/linkedin";
import { flattenCaption } from "@/lib/social/caption";
import type { Platform, PublishResult } from "@/lib/social/types";
import type { CaptionSet, Localized } from "@/lib/ai/types";
import type { SocialAccount, GeneratedPost, PostMedia } from "@prisma/client";

const CAPTION_KEY_BY_PLATFORM: Record<Platform, keyof CaptionSet> = {
  FACEBOOK: "facebook",
  INSTAGRAM: "instagram",
  LINKEDIN: "linkedin",
};

const SINGLE_PUBLISHERS: Record<
  Platform,
  (input: Parameters<typeof publishToFacebook>[0]) => Promise<PublishResult>
> = {
  FACEBOOK: publishToFacebook,
  INSTAGRAM: publishToInstagram,
  LINKEDIN: publishToLinkedIn,
};

const CAROUSEL_PUBLISHERS: Record<
  Platform,
  (input: Parameters<typeof publishCarouselToFacebook>[0]) => Promise<PublishResult>
> = {
  FACEBOOK: publishCarouselToFacebook,
  INSTAGRAM: publishCarouselToInstagram,
  LINKEDIN: publishCarouselToLinkedIn,
};

export async function publishPostToPlatforms(args: {
  post: GeneratedPost & { media?: PostMedia[] };
  accounts: SocialAccount[];
}): Promise<PublishResult[]> {
  const { post, accounts } = args;
  if (!post.imageUrl) {
    throw new Error("Post has no image to publish.");
  }

  const platforms = post.platforms as Platform[];
  const captions = (post.captions ?? {}) as unknown as CaptionSet;
  const isCarousel = post.postType === "CAROUSEL" && (post.media?.length ?? 0) > 0;
  const results: PublishResult[] = [];

  for (const platform of platforms) {
    const account = accounts.find((a) => a.platform === platform && a.isActive);
    if (!account) {
      results.push({ platform, success: false, error: `No connected ${platform} account.` });
      continue;
    }

    const captionKey = CAPTION_KEY_BY_PLATFORM[platform];
    const caption = flattenCaption(captions[captionKey] as Localized | undefined);
    const accessToken = decrypt(account.accessToken);

    if (isCarousel) {
      const imageUrls = (post.media ?? [])
        .sort((a, b) => a.order - b.order)
        .map((m) => m.imageUrl)
        .filter((url): url is string => Boolean(url));
      const publisher = CAROUSEL_PUBLISHERS[platform];
      const result = await publisher({
        imageUrls,
        caption,
        accessToken,
        accountId: account.accountId,
        metadata: account.metadata as Record<string, unknown> | null,
      });
      results.push(result);
      continue;
    }

    const publisher = SINGLE_PUBLISHERS[platform];
    const result = await publisher({
      imageUrl: post.imageUrl,
      caption,
      accessToken,
      accountId: account.accountId,
      metadata: account.metadata as Record<string, unknown> | null,
    });
    results.push(result);
  }

  return results;
}
