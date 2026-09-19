import type { CarouselPublishInput, PublishInput, PublishResult } from "@/lib/social/types";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

function assertPublicUrl(imageUrl: string) {
  if (imageUrl.startsWith("data:")) {
    throw new Error(
      "Facebook requires a publicly reachable image URL. Configure BLOB_READ_WRITE_TOKEN so generated images are uploaded to durable storage before publishing."
    );
  }
}

/** Publishes a photo post (image + caption) to a Facebook Page. */
export async function publishToFacebook(input: PublishInput): Promise<PublishResult> {
  try {
    assertPublicUrl(input.imageUrl);
    const params = new URLSearchParams({
      url: input.imageUrl,
      caption: input.caption,
      access_token: input.accessToken,
    });
    const res = await fetch(`${GRAPH_BASE}/${input.accountId}/photos`, {
      method: "POST",
      body: params,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || `Facebook API error (${res.status})`);
    }
    return { platform: "FACEBOOK", success: true, remotePostId: data.post_id || data.id };
  } catch (error) {
    return {
      platform: "FACEBOOK",
      success: false,
      error: error instanceof Error ? error.message : "Unknown Facebook publish error",
    };
  }
}

/**
 * Publishes a multi-photo carousel post to a Facebook Page: each image is
 * first uploaded unpublished to get a photo ID, then a single feed post is
 * created referencing all of them via attached_media.
 */
export async function publishCarouselToFacebook(input: CarouselPublishInput): Promise<PublishResult> {
  try {
    input.imageUrls.forEach(assertPublicUrl);

    const photoIds = await Promise.all(
      input.imageUrls.map(async (url) => {
        const params = new URLSearchParams({
          url,
          published: "false",
          access_token: input.accessToken,
        });
        const res = await fetch(`${GRAPH_BASE}/${input.accountId}/photos`, {
          method: "POST",
          body: params,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message || `Facebook photo upload error (${res.status})`);
        return data.id as string;
      })
    );

    const postParams = new URLSearchParams({ message: input.caption, access_token: input.accessToken });
    photoIds.forEach((id, index) => postParams.append(`attached_media[${index}]`, JSON.stringify({ media_fbid: id })));

    const postRes = await fetch(`${GRAPH_BASE}/${input.accountId}/feed`, {
      method: "POST",
      body: postParams,
    });
    const postData = await postRes.json();
    if (!postRes.ok) throw new Error(postData?.error?.message || `Facebook carousel post error (${postRes.status})`);

    return { platform: "FACEBOOK", success: true, remotePostId: postData.id };
  } catch (error) {
    return {
      platform: "FACEBOOK",
      success: false,
      error: error instanceof Error ? error.message : "Unknown Facebook carousel publish error",
    };
  }
}

/** Exchanges a short-lived user token for a long-lived Page access token. */
export async function getLongLivedPageToken(shortLivedUserToken: string, pageId: string) {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const exchangeParams = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId ?? "",
    client_secret: appSecret ?? "",
    fb_exchange_token: shortLivedUserToken,
  });
  const exchangeRes = await fetch(`${GRAPH_BASE}/oauth/access_token?${exchangeParams}`);
  const exchangeData = await exchangeRes.json();
  if (!exchangeRes.ok) throw new Error(exchangeData?.error?.message || "Token exchange failed");
  const longLivedUserToken: string = exchangeData.access_token;

  const pagesRes = await fetch(
    `${GRAPH_BASE}/me/accounts?access_token=${longLivedUserToken}`
  );
  const pagesData = await pagesRes.json();
  if (!pagesRes.ok) throw new Error(pagesData?.error?.message || "Fetching pages failed");
  const page = (pagesData.data || []).find((p: { id: string }) => p.id === pageId);
  if (!page) throw new Error("Page not found in the authorized account list.");
  return { pageAccessToken: page.access_token as string, pageName: page.name as string };
}

export async function listFacebookPages(userAccessToken: string) {
  const res = await fetch(`${GRAPH_BASE}/me/accounts?access_token=${userAccessToken}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Fetching pages failed");
  return data.data as Array<{
    id: string;
    name: string;
    access_token: string;
    instagram_business_account?: { id: string };
  }>;
}
