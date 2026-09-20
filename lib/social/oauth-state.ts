import crypto from "node:crypto";

/** Generates a random CSRF nonce for the OAuth `state` parameter. */
export function createOAuthState(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Extracts and decodes a `nonce:brandId` OAuth state cookie from a raw
 * Cookie request header. Cookie values are commonly percent-encoded by the
 * framework that sets them (e.g. `:` becomes `%3A`), so the raw header must
 * be decoded before splitting on `:` — parsing it naively silently drops
 * everything after the colon.
 */
export function parseOAuthStateCookie(
  cookieHeader: string | null,
  cookieName: string
): { nonce?: string; brandId?: string } {
  const raw = cookieHeader
    ?.split("; ")
    .find((c) => c.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
  if (!raw) return {};

  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }

  const [nonce, brandId] = decoded.split(":");
  return { nonce, brandId };
}
