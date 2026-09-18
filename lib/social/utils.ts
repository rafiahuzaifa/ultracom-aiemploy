/** Resolves an image URL (http(s):// or data:) to raw bytes + content type. */
export async function getImageBuffer(
  imageUrl: string
): Promise<{ buffer: Buffer; contentType: string }> {
  if (imageUrl.startsWith("data:")) {
    const match = imageUrl.match(/^data:(.+?);base64,(.*)$/);
    if (!match) throw new Error("Malformed data URL.");
    const [, contentType, base64] = match;
    return { buffer: Buffer.from(base64, "base64"), contentType };
  }
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: res.headers.get("content-type") || "image/png",
  };
}
