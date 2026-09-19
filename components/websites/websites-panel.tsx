"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Globe, Loader2, Sparkles, Star, Trash2 } from "lucide-react";
import type { Website } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function WebsitesPanel() {
  const [websites, setWebsites] = useState<Website[] | null>(null);
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/websites");
    if (res.ok) setWebsites((await res.json()).websites);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addWebsite() {
    if (!url) return;
    setAdding(true);
    try {
      const res = await fetch("/api/websites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error();
      setUrl("");
      await load();
      toast.success("Website added. Run analysis to teach the agent about your brand.");
    } catch {
      toast.error("Couldn't add that website. Make sure it's a valid URL.");
    } finally {
      setAdding(false);
    }
  }

  async function analyze(id: string) {
    setAnalyzingId(id);
    try {
      const res = await fetch(`/api/websites/${id}/analyze`, { method: "POST" });
      if (!res.ok) throw new Error();
      await load();
      toast.success("Website analyzed — niche, products, and brand voice updated.");
    } catch {
      toast.error("Analysis failed. Check FIRECRAWL_API_KEY / your AI provider key.");
    } finally {
      setAnalyzingId(null);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/websites/${id}`, { method: "DELETE" });
    await load();
  }

  async function setPrimary(id: string) {
    await fetch(`/api/websites/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setPrimary: true }),
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Websites</h1>
        <p className="text-sm text-muted-foreground">
          Connect your site so the agent understands your niche, products, audience, and voice.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a website</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="https://yourbrand.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Button onClick={addWebsite} disabled={adding}>
            {adding && <Loader2 className="h-4 w-4 animate-spin" />}
            Add
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {websites?.map((site) => {
          return (
            <Card key={site.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">{site.url}</CardTitle>
                  {site.isPrimary && <Badge variant="secondary">Primary</Badge>}
                </div>
                <div className="flex gap-1">
                  {!site.isPrimary && (
                    <Button size="icon" variant="ghost" onClick={() => setPrimary(site.id)} title="Set as primary">
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => remove(site.id)} title="Remove">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {site.analyzedAt ? (
                  <div className="grid gap-2 text-sm md:grid-cols-2">
                    <p><span className="text-muted-foreground">Niche: </span>{site.niche}</p>
                    {Array.isArray(site.products) && site.products.length > 0 && (
                      <p className="md:col-span-2">
                        <span className="text-muted-foreground">Products: </span>
                        {(site.products as string[]).join(", ")}
                      </p>
                    )}
                    <p className="md:col-span-2 text-xs text-muted-foreground">
                      Target audience, brand voice, and USPs are managed on the{" "}
                      <a href="/settings" className="underline">Settings</a> page (analysis pre-fills them once).
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not analyzed yet.</p>
                )}
                <Separator />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={analyzingId === site.id}
                  onClick={() => analyze(site.id)}
                >
                  {analyzingId === site.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {site.analyzedAt ? "Re-analyze" : "Analyze now"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
        {websites?.length === 0 && (
          <p className="text-sm text-muted-foreground">No websites connected yet.</p>
        )}
      </div>
    </div>
  );
}
