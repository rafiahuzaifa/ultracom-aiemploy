import type { PublishInput, PublishResult } from "@/lib/social/types";

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
