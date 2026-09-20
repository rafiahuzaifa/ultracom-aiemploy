import type { CarouselPublishInput, PublishInput, PublishResult } from "@/lib/social/types";

// "Instagram API with Instagram Login" — Meta's current Instagram
// integration path. Publishing goes through graph.instagram.com using an
// Instagram-scoped access token (obtained via Instagram's own OAuth
// endpoints, not Facebook's), rather than a Facebook Page token.
const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.instagram.com/${GRAPH_VERSION}`;

function assertPublicUrl(imageUrl: string) {
  if (imageUrl.startsWith("data:")) {
    throw new Error(
      "Instagram requires a publicly reachable image URL. Configure BLOB_READ_WRITE_TOKEN so generated images are uploaded to durable storage before publishing."
    );
  }
}

/**
 * Publishes an image post to an Instagram professional account via the
 * container -> publish flow.
 */
export async function publishToInstagram(input: PublishInput): Promise<PublishResult> {
  try {
    assertPublicUrl(input.imageUrl);

    const createParams = new URLSearchParams({
      image_url: input.imageUrl,
      caption: input.caption,
      access_token: input.accessToken,
    });
    const createRes = await fetch(`${GRAPH_BASE}/${input.accountId}/media`, {
      method: "POST",
      body: createParams,
    });
    const createData = await createRes.json();
    if (!createRes.ok) {
      throw new Error(createData?.error?.message || `Instagram container error (${createRes.status})`);
    }
    const creationId = createData.id;

    const publishParams = new URLSearchParams({
      creation_id: creationId,
      access_token: input.accessToken,
    });
    const publishRes = await fetch(`${GRAPH_BASE}/${input.accountId}/media_publish`, {
      method: "POST",
      body: publishParams,
    });
    const publishData = await publishRes.json();
    if (!publishRes.ok) {
      throw new Error(publishData?.error?.message || `Instagram publish error (${publishRes.status})`);
    }

    return { platform: "INSTAGRAM", success: true, remotePostId: publishData.id };
  } catch (error) {
    return {
      platform: "INSTAGRAM",
      success: false,
      error: error instanceof Error ? error.message : "Unknown Instagram publish error",
    };
  }
}

/**
 * Publishes a carousel post: each image becomes a child media container
 * (is_carousel_item), then a parent carousel container references all
 * children before publishing.
 */
export async function publishCarouselToInstagram(input: CarouselPublishInput): Promise<PublishResult> {
  try {
    input.imageUrls.forEach(assertPublicUrl);

    const childIds = await Promise.all(
      input.imageUrls.map(async (url) => {
        const params = new URLSearchParams({
          image_url: url,
          is_carousel_item: "true",
          access_token: input.accessToken,
        });
        const res = await fetch(`${GRAPH_BASE}/${input.accountId}/media`, { method: "POST", body: params });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message || `Instagram child container error (${res.status})`);
        return data.id as string;
      })
    );

    const carouselParams = new URLSearchParams({
      media_type: "CAROUSEL",
      caption: input.caption,
      children: childIds.join(","),
      access_token: input.accessToken,
    });
    const carouselRes = await fetch(`${GRAPH_BASE}/${input.accountId}/media`, {
      method: "POST",
      body: carouselParams,
    });
    const carouselData = await carouselRes.json();
    if (!carouselRes.ok) {
      throw new Error(carouselData?.error?.message || `Instagram carousel container error (${carouselRes.status})`);
    }

    const publishParams = new URLSearchParams({
      creation_id: carouselData.id,
      access_token: input.accessToken,
    });
    const publishRes = await fetch(`${GRAPH_BASE}/${input.accountId}/media_publish`, {
      method: "POST",
      body: publishParams,
    });
    const publishData = await publishRes.json();
    if (!publishRes.ok) {
      throw new Error(publishData?.error?.message || `Instagram carousel publish error (${publishRes.status})`);
    }

    return { platform: "INSTAGRAM", success: true, remotePostId: publishData.id };
  } catch (error) {
    return {
      platform: "INSTAGRAM",
      success: false,
      error: error instanceof Error ? error.message : "Unknown Instagram carousel publish error",
    };
  }
}

/** Step 1 of Instagram Login token exchange: authorization code -> short-lived token. */
export async function exchangeInstagramCode(args: {
  code: string;
  appId: string;
  appSecret: string;
  redirectUri: string;
}): Promise<{ accessToken: string; userId: string }> {
  const body = new URLSearchParams({
    client_id: args.appId,
    client_secret: args.appSecret,
    grant_type: "authorization_code",
    redirect_uri: args.redirectUri,
    code: args.code,
  });
  const res = await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", body });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error_message || "Instagram token exchange failed");
  return { accessToken: data.access_token, userId: String(data.user_id) };
}

/** Step 2: exchange the short-lived token for a long-lived one (~60 days, refreshable). */
export async function exchangeForLongLivedInstagramToken(args: {
  shortLivedToken: string;
  appSecret: string;
}): Promise<{ accessToken: string; expiresIn: number }> {
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: args.appSecret,
    access_token: args.shortLivedToken,
  });
  const res = await fetch(`https://graph.instagram.com/access_token?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Instagram long-lived token exchange failed");
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

export async function getInstagramProfile(accessToken: string): Promise<{ id: string; username: string }> {
  const res = await fetch(
    `https://graph.instagram.com/${GRAPH_VERSION}/me?fields=id,username&access_token=${accessToken}`
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Fetching Instagram profile failed");
  return { id: data.id, username: data.username };
}
