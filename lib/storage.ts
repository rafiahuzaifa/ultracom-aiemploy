import { put } from "@vercel/blob";

/**
 * Persists a base64-encoded image to durable storage and returns a public URL.
 * Uses Vercel Blob in production; falls back to a data: URL in local dev when
 * no BLOB_READ_WRITE_TOKEN is configured, so the app still runs without cloud
 * storage set up.
 */
export async function saveImageAndGetUrl(args: {
  base64: string;
  mimeType: string;
  filename: string;
}): Promise<string> {
  const { base64, mimeType, filename } = args;
  const buffer = Buffer.from(base64, "base64");

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(filename, buffer, {
      access: "public",
      contentType: mimeType,
      addRandomSuffix: true,
    });
    return blob.url;
  }

  return `data:${mimeType};base64,${base64}`;
}
