import { put } from "@vercel/blob";

/**
 * Persists a base64-encoded image to durable storage and returns a public URL.
 * Uses Vercel Blob when a store is connected — either via the classic
 * BLOB_READ_WRITE_TOKEN env var, or via BLOB_STORE_ID (Vercel's newer
 * "Connect Store" flow, which authenticates through the platform's OIDC
 * token at runtime instead of a static secret). Falls back to an inline
 * data: URL in local dev when neither is configured, so the app still runs
 * without cloud storage set up — though Facebook/Instagram publishing
 * requires a real public URL, so this fallback only works for local testing.
 */
export async function saveImageAndGetUrl(args: {
  base64: string;
  mimeType: string;
  filename: string;
}): Promise<string> {
  const { base64, mimeType, filename } = args;
  const buffer = Buffer.from(base64, "base64");

  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) {
    const blob = await put(filename, buffer, {
      access: "public",
      contentType: mimeType,
      addRandomSuffix: true,
    });
    return blob.url;
  }

  return `data:${mimeType};base64,${base64}`;
}
