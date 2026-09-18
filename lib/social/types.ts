export type Platform = "FACEBOOK" | "INSTAGRAM" | "LINKEDIN";

export interface PublishInput {
  imageUrl: string;
  caption: string;
  accessToken: string;
  accountId: string;
  metadata?: Record<string, unknown> | null;
}

export interface PublishResult {
  platform: Platform;
  success: boolean;
  remotePostId?: string;
  error?: string;
}
