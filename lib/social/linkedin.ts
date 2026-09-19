import { getImageBuffer } from "@/lib/social/utils";
import type { CarouselPublishInput, PublishInput, PublishResult } from "@/lib/social/types";

const API_BASE = "https://api.linkedin.com/v2";

function authHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
  };
}

/** Registers + uploads one image to LinkedIn, returning its media asset URN. */
async function uploadImageAsset(args: { imageUrl: string; accessToken: string; organizationUrn: string }) {
  const { imageUrl, accessToken, organizationUrn } = args;

  const registerRes = await fetch(`${API_BASE}/assets?action=registerUpload`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: organizationUrn,
        serviceRelationships: [
          { relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" },
        ],
      },
    }),
  });
  const registerData = await registerRes.json();
  if (!registerRes.ok) {
    throw new Error(registerData?.message || `LinkedIn register upload failed (${registerRes.status})`);
  }
  const uploadUrl =
    registerData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]
      .uploadUrl;
  const asset = registerData.value.asset as string;

  const { buffer, contentType } = await getImageBuffer(imageUrl);
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": contentType },
    body: new Uint8Array(buffer),
  });
  if (!uploadRes.ok) throw new Error(`LinkedIn image upload failed (${uploadRes.status})`);

  return asset;
}

/**
 * Publishes an image post to a LinkedIn Company Page using the UGC Posts API:
 * 1. Register an image upload against the organization.
 * 2. PUT the raw image bytes to the returned upload URL.
 * 3. Create the UGC post referencing the uploaded media asset.
 */
export async function publishToLinkedIn(input: PublishInput): Promise<PublishResult> {
  try {
    const organizationUrn = `urn:li:organization:${input.accountId}`;
    const asset = await uploadImageAsset({
      imageUrl: input.imageUrl,
      accessToken: input.accessToken,
      organizationUrn,
    });

    const postRes = await fetch(`${API_BASE}/ugcPosts`, {
      method: "POST",
      headers: authHeaders(input.accessToken),
      body: JSON.stringify({
        author: organizationUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text: input.caption },
            shareMediaCategory: "IMAGE",
            media: [{ status: "READY", media: asset }],
          },
        },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      }),
    });
    const postData = await postRes.json();
    if (!postRes.ok) {
      throw new Error(postData?.message || `LinkedIn post creation failed (${postRes.status})`);
    }

    return { platform: "LINKEDIN", success: true, remotePostId: postData.id };
  } catch (error) {
    return {
      platform: "LINKEDIN",
      success: false,
      error: error instanceof Error ? error.message : "Unknown LinkedIn publish error",
    };
  }
}

/** Publishes a multi-image post to a LinkedIn Company Page (LinkedIn's closest equivalent to a carousel). */
export async function publishCarouselToLinkedIn(input: CarouselPublishInput): Promise<PublishResult> {
  try {
    const organizationUrn = `urn:li:organization:${input.accountId}`;
    const assets = await Promise.all(
      input.imageUrls.map((imageUrl) =>
        uploadImageAsset({ imageUrl, accessToken: input.accessToken, organizationUrn })
      )
    );

    const postRes = await fetch(`${API_BASE}/ugcPosts`, {
      method: "POST",
      headers: authHeaders(input.accessToken),
      body: JSON.stringify({
        author: organizationUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text: input.caption },
            shareMediaCategory: "IMAGE",
            media: assets.map((asset) => ({ status: "READY", media: asset })),
          },
        },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      }),
    });
    const postData = await postRes.json();
    if (!postRes.ok) {
      throw new Error(postData?.message || `LinkedIn multi-image post creation failed (${postRes.status})`);
    }

    return { platform: "LINKEDIN", success: true, remotePostId: postData.id };
  } catch (error) {
    return {
      platform: "LINKEDIN",
      success: false,
      error: error instanceof Error ? error.message : "Unknown LinkedIn carousel publish error",
    };
  }
}
