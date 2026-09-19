import type { CarouselPublishInput, PublishInput, PublishResult } from "@/lib/social/types";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

function assertPublicUrl(imageUrl: string) {
  if (imageUrl.startsWith("data:")) {
    throw new Error(
      "Instagram requires a publicly reachable image URL. Configure BLOB_READ_WRITE_TOKEN so generated images are uploaded to durable storage before publishing."
    );
  }
}

/**
 * Publishes an image post to an Instagram Business Account via the Meta
 * Graph API's two-step container -> publish flow.
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
 * Publishes a carousel post to an Instagram Business Account: each image
 * becomes a child media container (is_carousel_item), then a parent
 * carousel container references all children before publishing.
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
