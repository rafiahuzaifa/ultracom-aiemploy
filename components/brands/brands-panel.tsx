"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Building2, Check, Loader2, Sparkles, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useBrand } from "@/components/providers/brand-provider";

export function BrandsPanel() {
  const { brands, currentBrandId, setCurrentBrandId, refreshBrands } = useBrand();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  async function addBrand() {
    if (!name || !url) return;
    setAdding(true);
    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, websiteUrl: url }),
      });
      if (!res.ok) throw new Error();
      const { brand } = await res.json();
      setName("");
      setUrl("");
      await refreshBrands();
      setCurrentBrandId(brand.id);
      toast.success(`${brand.name} added. Run analysis to teach the agent about it.`);
    } catch {
      toast.error("Couldn't add that brand. Make sure the URL is valid.");
    } finally {
      setAdding(false);
    }
  }

  async function analyze(id: string) {
    setAnalyzingId(id);
    try {
      const res = await fetch(`/api/brands/${id}/analyze`, { method: "POST" });
      if (!res.ok) throw new Error();
      await refreshBrands();
      toast.success("Website analyzed — niche, products, and brand voice updated.");
    } catch {
      toast.error("Analysis failed. Check your AI provider key.");
    } finally {
      setAnalyzingId(null);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/brands/${id}`, { method: "DELETE" });
    await refreshBrands();
  }

  async function setPrimary(id: string) {
    await fetch(`/api/brands/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setPrimary: true }),
    });
    await refreshBrands();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Brands</h1>
        <p className="text-sm text-muted-foreground">
          Each brand is a completely independent operation — its own website analysis, voice,
          language, content preferences, social accounts, and schedule. The agent never mixes
          content between brands.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a brand</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_1.5fr_auto] md:items-end">
          <div>
            <Label>Brand name</Label>
            <Input placeholder="Acme Coffee Co." value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Website URL</Label>
            <Input placeholder="https://yourbrand.com" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <Button onClick={addBrand} disabled={adding}>
            {adding && <Loader2 className="h-4 w-4 animate-spin" />}
            Add brand
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {brands.map((brand) => (
          <Card key={brand.id} className={brand.id === currentBrandId ? "ring-1 ring-primary/50" : ""}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">{brand.name}</CardTitle>
                {brand.isPrimary && <Badge variant="secondary">Primary</Badge>}
                {brand.id === currentBrandId && <Badge variant="success">Selected</Badge>}
              </div>
              <div className="flex gap-1">
                {brand.id !== currentBrandId && (
                  <Button size="sm" variant="outline" onClick={() => setCurrentBrandId(brand.id)}>
                    <Check className="h-4 w-4" /> Switch to this brand
                  </Button>
                )}
                {!brand.isPrimary && (
                  <Button size="icon" variant="ghost" onClick={() => setPrimary(brand.id)} title="Set as primary">
                    <Star className="h-4 w-4" />
                  </Button>
                )}
                <Button size="icon" variant="ghost" onClick={() => remove(brand.id)} title="Remove">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">{brand.websiteUrl}</p>
              {brand.analyzedAt ? (
                <div className="grid gap-2 text-sm md:grid-cols-2">
                  <p><span className="text-muted-foreground">Niche: </span>{brand.niche}</p>
                  {Array.isArray(brand.products) && brand.products.length > 0 && (
                    <p className="md:col-span-2">
                      <span className="text-muted-foreground">Products: </span>
                      {(brand.products as string[]).join(", ")}
                    </p>
                  )}
                  <p className="md:col-span-2 text-xs text-muted-foreground">
                    Voice, tone, audience, USPs, language, and content types are managed on the{" "}
                    <a href="/settings" className="underline">Settings</a> page for this brand.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not analyzed yet.</p>
              )}
              <Separator />
              <Button
                size="sm"
                variant="outline"
                disabled={analyzingId === brand.id}
                onClick={() => analyze(brand.id)}
              >
                {analyzingId === brand.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {brand.analyzedAt ? "Re-analyze" : "Analyze now"}
              </Button>
            </CardContent>
          </Card>
        ))}
        {brands.length === 0 && (
          <p className="text-sm text-muted-foreground">No brands yet — add your first one above.</p>
        )}
      </div>
    </div>
  );
}
