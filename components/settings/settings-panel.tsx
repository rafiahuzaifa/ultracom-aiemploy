"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { AgentSettings, BrandProfile, Language, PostType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBrand } from "@/components/providers/brand-provider";

const CONTENT_TYPE_OPTIONS: { value: PostType; label: string }[] = [
  { value: "IMAGE", label: "Single image posts" },
  { value: "CAROUSEL", label: "Carousel posts (3-5 slides)" },
  { value: "REEL", label: "Reel concepts (script + scenes)" },
];

export function SettingsPanel() {
  const { currentBrand, currentBrandId } = useBrand();
  const [settings, setSettings] = useState<AgentSettings | null>(null);
  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [uspsText, setUspsText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentBrandId) return;
    setSettings(null);
    setProfile(null);
    fetch(`/api/brands/${currentBrandId}/settings`)
      .then((r) => r.json())
      .then((d) => setSettings(d.settings));
    fetch(`/api/brands/${currentBrandId}/profile`)
      .then((r) => r.json())
      .then((d) => {
        setProfile(d.profile);
        setUspsText((d.profile?.uniqueSellingPoints ?? []).join(", "));
      });
  }, [currentBrandId]);

  function toggleContentType(type: PostType) {
    if (!profile) return;
    const current = profile.contentTypes ?? [];
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    if (next.length === 0) return; // require at least one
    setProfile({ ...profile, contentTypes: next });
  }

  async function save() {
    if (!settings || !profile || !currentBrandId) return;
    setSaving(true);
    try {
      const [settingsRes, profileRes] = await Promise.all([
        fetch(`/api/brands/${currentBrandId}/settings`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            isActive: settings.isActive,
            frequencyHours: settings.frequencyHours,
            postsPerRun: settings.postsPerRun,
            notifyOnReady: settings.notifyOnReady,
            autoApprove: settings.autoApprove,
          }),
        }),
        fetch(`/api/brands/${currentBrandId}/profile`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brandVoice: profile.brandVoice ?? "",
            tone: profile.tone ?? "",
            targetAudience: profile.targetAudience ?? "",
            uniqueSellingPoints: uspsText
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            languagePreference: profile.languagePreference,
            contentTypes: profile.contentTypes,
            dos: profile.dos ?? "",
            donts: profile.donts ?? "",
          }),
        }),
      ]);
      if (!settingsRes.ok || !profileRes.ok) throw new Error();
      toast.success("Settings saved.");
    } catch {
      toast.error("Couldn't save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (!currentBrand) {
    return (
      <p className="text-sm text-muted-foreground">
        Select or add a brand under <a href="/brands" className="underline">Brands</a> to configure its settings.
      </p>
    );
  }

  if (!settings || !profile) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings — {currentBrand.name}</h1>
        <p className="text-sm text-muted-foreground">
          Control how often the agent runs, what it creates, and how it represents this brand
          specifically. Nothing here affects your other brands.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schedule</CardTitle>
          <CardDescription>How often the agent researches and drafts new posts for this brand.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Agent active</Label>
            <Switch
              checked={settings.isActive}
              onCheckedChange={(v) => setSettings({ ...settings, isActive: v })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Run frequency (hours)</Label>
              <Input
                type="number"
                min={1}
                max={168}
                value={settings.frequencyHours}
                onChange={(e) => setSettings({ ...settings, frequencyHours: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Posts per run (1-3)</Label>
              <Input
                type="number"
                min={1}
                max={3}
                value={settings.postsPerRun}
                onChange={(e) => setSettings({ ...settings, postsPerRun: Number(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Content types</CardTitle>
          <CardDescription>What the agent should create each run (cycles through your selection).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {CONTENT_TYPE_OPTIONS.map((opt) => (
            <div key={opt.value} className="flex items-center justify-between">
              <Label>{opt.label}</Label>
              <Switch
                checked={profile.contentTypes.includes(opt.value)}
                onCheckedChange={() => toggleContentType(opt.value)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Language</CardTitle>
          <CardDescription>Which language(s) captions are generated in for this brand.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={profile.languagePreference}
            onValueChange={(v) => setProfile({ ...profile, languagePreference: v as Language })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EN">English only</SelectItem>
              <SelectItem value="UR">Urdu only</SelectItem>
              <SelectItem value="BOTH">English + Urdu</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Brand guidelines</CardTitle>
          <CardDescription>Used alongside this brand&apos;s website analysis in every generation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Brand voice</Label>
            <Textarea
              placeholder="Confident, warm, a little playful — never salesy."
              value={profile.brandVoice ?? ""}
              onChange={(e) => setProfile({ ...profile, brandVoice: e.target.value })}
            />
          </div>
          <div>
            <Label>Tone</Label>
            <Input
              placeholder="e.g. Friendly and premium"
              value={profile.tone ?? ""}
              onChange={(e) => setProfile({ ...profile, tone: e.target.value })}
            />
          </div>
          <div>
            <Label>Target audience</Label>
            <Textarea
              placeholder="Busy parents aged 30-45 who value convenience."
              value={profile.targetAudience ?? ""}
              onChange={(e) => setProfile({ ...profile, targetAudience: e.target.value })}
            />
          </div>
          <div>
            <Label>Unique selling points</Label>
            <Textarea
              placeholder="Comma-separated, e.g. Handmade in small batches, 24-hour delivery, Lifetime warranty"
              value={uspsText}
              onChange={(e) => setUspsText(e.target.value)}
            />
          </div>
          <div>
            <Label>Do&apos;s</Label>
            <Textarea
              placeholder="Lead with benefits, use social proof, clear CTA."
              value={profile.dos ?? ""}
              onChange={(e) => setProfile({ ...profile, dos: e.target.value })}
            />
          </div>
          <div>
            <Label>Don&apos;ts</Label>
            <Textarea
              placeholder="No fake urgency, no medical claims, no emoji spam."
              value={profile.donts ?? ""}
              onChange={(e) => setProfile({ ...profile, donts: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Approval workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Notify me when posts are ready</Label>
            </div>
            <Switch
              checked={settings.notifyOnReady}
              onCheckedChange={(v) => setSettings({ ...settings, notifyOnReady: v })}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-approve generated posts</Label>
              <p className="text-xs text-muted-foreground">Skips human review and publishes immediately. Not recommended.</p>
            </div>
            <Switch
              checked={settings.autoApprove}
              onCheckedChange={(v) => setSettings({ ...settings, autoApprove: v })}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving}>
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Save settings
      </Button>
    </div>
  );
}
