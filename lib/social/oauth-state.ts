import crypto from "node:crypto";

/** Generates a random CSRF nonce for the OAuth `state` parameter. */
export function createOAuthState(): string {
  return crypto.randomBytes(16).toString("hex");
}
