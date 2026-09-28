import type { ResolvedIntegrationSettings } from "@/lib/integrations";

const GRAPH_VERSION = "v21.0";

/**
 * Sends a one-way WhatsApp notification (not a two-way chat) via the free
 * WhatsApp Cloud API, telling the account owner new posts are ready to
 * review. WhatsApp requires business-initiated messages outside an active
 * 24h customer conversation to use a pre-approved message template — this
 * expects one named "posts_ready" with two body variables: brand name and
 * post count. Never throws — a missing/failed WhatsApp send should never
 * break the agent run itself.
 */
export async function sendPostsReadyWhatsApp(args: {
  settings: ResolvedIntegrationSettings;
  brandName: string;
  postCount: number;
  appUrl: string;
}): Promise<void> {
  const { settings, brandName, postCount } = args;
  const { whatsappPhoneNumberId, whatsappAccessToken, whatsappRecipientNumber } = settings;

  if (!whatsappPhoneNumberId || !whatsappAccessToken || !whatsappRecipientNumber) return;

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${whatsappPhoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${whatsappAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: whatsappRecipientNumber,
        type: "template",
        template: {
          name: "posts_ready",
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: brandName },
                { type: "text", text: String(postCount) },
              ],
            },
          ],
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`WhatsApp notification failed (${res.status}): ${body}`);
    }
  } catch (error) {
    console.error("WhatsApp notification failed:", error);
  }
}
