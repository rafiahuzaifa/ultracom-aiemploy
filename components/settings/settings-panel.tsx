"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { AgentSettings } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export function SettingsPanel() {
  const [settings, setSettings] = useState<AgentSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings));
  }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: settings.isActive,
          frequencyHours: settings.frequencyHours,
          postsPerRun: settings.postsPerRun,
          brandVoice: settings.brandVoice ?? "",
          targetAudience: settings.targetAudience ?? "",
          dos: settings.dos ?? "",
          donts: settings.donts ?? "",
          notifyOnReady: settings.notifyOnReady,
          autoApprove: settings.autoApprove,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Settings saved.");
    } catch {
      toast.error("Couldn't save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agent settings</h1>
        <p className="text-sm text-muted-foreground">
          Control how often the agent runs and how it should represent your brand.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schedule</CardTitle>
          <CardDescription>How often the agent researches and drafts new posts.</CardDescription>
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
          <CardTitle className="text-base">Brand guidelines</CardTitle>
          <CardDescription>Used alongside your website analysis in every generation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Brand voice</Label>
            <Textarea
              placeholder="Confident, warm, a little playful — never salesy."
              value={settings.brandVoice ?? ""}
              onChange={(e) => setSettings({ ...settings, brandVoice: e.target.value })}
            />
          </div>
          <div>
            <Label>Target audience</Label>
            <Textarea
              placeholder="Busy parents aged 30-45 who value convenience."
              value={settings.targetAudience ?? ""}
              onChange={(e) => setSettings({ ...settings, targetAudience: e.target.value })}
            />
          </div>
          <div>
            <Label>Do&apos;s</Label>
            <Textarea
              placeholder="Lead with benefits, use social proof, clear CTA."
              value={settings.dos ?? ""}
              onChange={(e) => setSettings({ ...settings, dos: e.target.value })}
            />
          </div>
          <div>
            <Label>Don&apos;ts</Label>
            <Textarea
              placeholder="No fake urgency, no medical claims, no emoji spam."
              value={settings.donts ?? ""}
              onChange={(e) => setSettings({ ...settings, donts: e.target.value })}
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
