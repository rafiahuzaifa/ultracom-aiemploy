"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SecretField } from "@/components/integrations/secret-field";
import { BackLink } from "@/components/shell/back-link";

interface IntegrationStatus {
  aiTextProvider: string;
  aiImageProvider: string;
  geminiTextModel: string;
  geminiImageModel: string;
  openaiTextModel: string;
  metaAppId: string;
  metaConfigId: string;
  instagramAppId: string;
  linkedinClientId: string;
  hasGeminiApiKey: boolean;
  hasOpenaiApiKey: boolean;
  hasFirecrawlApiKey: boolean;
  hasMetaAppSecret: boolean;
  hasInstagramAppSecret: boolean;
  hasLinkedinClientSecret: boolean;
}

export function IntegrationsPanel() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [saving, setSaving] = useState(false);

  // Plain (non-secret) editable fields, pre-filled from the server.
  const [aiTextProvider, setAiTextProvider] = useState("gemini");
  const [aiImageProvider, setAiImageProvider] = useState("pollinations");
  const [geminiTextModel, setGeminiTextModel] = useState("");
  const [geminiImageModel, setGeminiImageModel] = useState("");
  const [openaiTextModel, setOpenaiTextModel] = useState("");
  const [metaAppId, setMetaAppId] = useState("");
  const [metaConfigId, setMetaConfigId] = useState("");
  const [instagramAppId, setInstagramAppId] = useState("");
  const [linkedinClientId, setLinkedinClientId] = useState("");

  // Secret fields — always start blank; only sent to the server if the
  // user actually types something new.
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [firecrawlApiKey, setFirecrawlApiKey] = useState("");
  const [metaAppSecret, setMetaAppSecret] = useState("");
  const [instagramAppSecret, setInstagramAppSecret] = useState("");
  const [linkedinClientSecret, setLinkedinClientSecret] = useState("");

  useEffect(() => {
    fetch("/api/integrations")
      .then((r) => r.json())
      .then((d: { status: IntegrationStatus }) => {
        setStatus(d.status);
        setAiTextProvider(d.status.aiTextProvider);
        setAiImageProvider(d.status.aiImageProvider);
        setGeminiTextModel(d.status.geminiTextModel);
        setGeminiImageModel(d.status.geminiImageModel);
        setOpenaiTextModel(d.status.openaiTextModel);
        setMetaAppId(d.status.metaAppId);
        setMetaConfigId(d.status.metaConfigId);
        setInstagramAppId(d.status.instagramAppId);
        setLinkedinClientId(d.status.linkedinClientId);
      });
  }, []);

  async function save() {
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        aiTextProvider,
        aiImageProvider,
        geminiTextModel,
        geminiImageModel,
        openaiTextModel,
        metaAppId,
        metaConfigId,
        instagramAppId,
        linkedinClientId,
      };
      if (geminiApiKey) payload.geminiApiKey = geminiApiKey;
      if (openaiApiKey) payload.openaiApiKey = openaiApiKey;
      if (firecrawlApiKey) payload.firecrawlApiKey = firecrawlApiKey;
      if (metaAppSecret) payload.metaAppSecret = metaAppSecret;
      if (instagramAppSecret) payload.instagramAppSecret = instagramAppSecret;
      if (linkedinClientSecret) payload.linkedinClientSecret = linkedinClientSecret;

      const res = await fetch("/api/integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const { status: newStatus } = await res.json();
      setStatus(newStatus);
      setGeminiApiKey("");
      setOpenaiApiKey("");
      setFirecrawlApiKey("");
      setMetaAppSecret("");
      setInstagramAppSecret("");
      setLinkedinClientSecret("");
      toast.success("Integrations saved.");
    } catch {
      toast.error("Couldn't save integrations.");
    } finally {
      setSaving(false);
    }
  }

  if (!status) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <BackLink />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          API keys and app credentials for every brand on your account, managed here instead of
          server environment variables — add, change, or rotate them anytime without a redeploy.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI providers</CardTitle>
          <CardDescription>Which service generates captions/research and which generates images.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Text provider</Label>
              <Select value={aiTextProvider} onValueChange={setAiTextProvider}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Image provider</Label>
              <Select value={aiImageProvider} onValueChange={setAiImageProvider}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pollinations">Pollinations (free, no key needed)</SelectItem>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <SecretField
            label="Gemini API key"
            isSet={status.hasGeminiApiKey}
            value={geminiApiKey}
            onChange={setGeminiApiKey}
            helperText="From aistudio.google.com/apikey — needed if either provider above is set to Gemini."
          />
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Gemini text model</Label>
              <Input value={geminiTextModel} onChange={(e) => setGeminiTextModel(e.target.value)} />
            </div>
            <div>
              <Label>Gemini image model</Label>
              <Input value={geminiImageModel} onChange={(e) => setGeminiImageModel(e.target.value)} />
            </div>
          </div>

          <SecretField
            label="OpenAI API key"
            isSet={status.hasOpenaiApiKey}
            value={openaiApiKey}
            onChange={setOpenaiApiKey}
            helperText="From platform.openai.com/api-keys — needed if either provider above is set to OpenAI."
          />
          <div>
            <Label>OpenAI text model</Label>
            <Input value={openaiTextModel} onChange={(e) => setOpenaiTextModel(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Website analysis</CardTitle>
          <CardDescription>Optional — improves scraping quality when analyzing a brand&apos;s website.</CardDescription>
        </CardHeader>
        <CardContent>
          <SecretField
            label="Firecrawl API key"
            isSet={status.hasFirecrawlApiKey}
            value={firecrawlApiKey}
            onChange={setFirecrawlApiKey}
            helperText="From firecrawl.dev. Without this, a basic built-in scraper is used instead."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Meta (Facebook Pages)</CardTitle>
          <CardDescription>
            From developers.facebook.com/apps — the main app credentials, used only for connecting
            Facebook Pages. One app covers every brand you connect.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>App ID</Label>
            <Input value={metaAppId} onChange={(e) => setMetaAppId(e.target.value)} placeholder="Not set" />
          </div>
          <SecretField
            label="App Secret"
            isSet={status.hasMetaAppSecret}
            value={metaAppSecret}
            onChange={setMetaAppSecret}
          />
          <div>
            <Label>Login Configuration ID</Label>
            <Input
              value={metaConfigId}
              onChange={(e) => setMetaConfigId(e.target.value)}
              placeholder="Not set"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              From App Dashboard → Facebook Login for Business → Configurations. Required for
              Business-type Meta apps — without it, Facebook rejects the connection with an
              &quot;Invalid Scopes&quot; error.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Instagram</CardTitle>
          <CardDescription>
            From the same Meta app, under &quot;Instagram API with Instagram Login&quot; — this
            product has its own separate App ID/Secret, different from the Facebook one above.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Instagram App ID</Label>
            <Input value={instagramAppId} onChange={(e) => setInstagramAppId(e.target.value)} placeholder="Not set" />
          </div>
          <SecretField
            label="Instagram App Secret"
            isSet={status.hasInstagramAppSecret}
            value={instagramAppSecret}
            onChange={setInstagramAppSecret}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">LinkedIn</CardTitle>
          <CardDescription>
            From linkedin.com/developers/apps — one app covers every brand you connect.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Client ID</Label>
            <Input value={linkedinClientId} onChange={(e) => setLinkedinClientId(e.target.value)} placeholder="Not set" />
          </div>
          <SecretField
            label="Client Secret"
            isSet={status.hasLinkedinClientSecret}
            value={linkedinClientSecret}
            onChange={setLinkedinClientSecret}
          />
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving}>
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Save integrations
      </Button>
    </div>
  );
}
