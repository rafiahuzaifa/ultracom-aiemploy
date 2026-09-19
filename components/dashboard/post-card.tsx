"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Image as ImageIcon, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import type { GeneratedPost, PostMedia } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FacebookPreview, InstagramPreview, LinkedInPreview } from "@/components/dashboard/platform-preview";
import { CarouselPreview } from "@/components/dashboard/carousel-preview";
import { ReelPreview } from "@/components/dashboard/reel-preview";
import { flattenCaption } from "@/lib/social/caption";
import { formatRelativeTime } from "@/lib/utils";
import type { CaptionSet, Localized, ReelScript } from "@/lib/ai/types";

type PostWithMedia = GeneratedPost & { media?: PostMedia[] };

const STATUS_VARIANT: Record<string, "default" | "secondary" | "warning" | "success" | "destructive"> = {
  PENDING_APPROVAL: "warning",
  APPROVED: "secondary",
  PUBLISHING: "secondary",
  PUBLISHED: "success",
  REJECTED: "destructive",
  FAILED: "destructive",
  REGENERATING: "secondary",
};

const TYPE_LABEL: Record<string, string> = {
  IMAGE: "Single image",
  CAROUSEL: "Carousel",
  REEL: "Reel concept",
};

const PLATFORM_KEYS = ["facebook", "instagram", "linkedin"] as const;

function emptyCaptionSet(): CaptionSet {
  return { facebook: {}, instagram: {}, linkedin: {} };
}

function LocalizedEditor({
  value,
  onChange,
  label,
}: {
  value: Localized;
  onChange: (v: Localized) => void;
  label: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      {value.en !== undefined && (
        <Textarea
          value={value.en ?? ""}
          onChange={(e) => onChange({ ...value, en: e.target.value })}
          placeholder="English caption"
          rows={2}
        />
      )}
      {value.ur !== undefined && (
        <Textarea
          value={value.ur ?? ""}
          onChange={(e) => onChange({ ...value, ur: e.target.value })}
          placeholder="اردو کیپشن"
          dir="rtl"
          rows={2}
        />
      )}
    </div>
  );
}

export function PostCard({
  post,
  brandName,
  onChanged,
}: {
  post: PostWithMedia;
  brandName: string;
  onChanged: () => void;
}) {
  const initialCaptions = (post.captions as unknown as CaptionSet | null) ?? emptyCaptionSet();
  const [captions, setCaptions] = useState<CaptionSet>(initialCaptions);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  async function patch(action: string, extra?: Record<string, unknown>) {
    setBusy(action);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (!res.ok) throw new Error("Request failed");
      onChanged();
    } catch {
      toast.error(`Couldn't ${action.replace("-", " ")} this post. Please try again.`);
    } finally {
      setBusy(null);
    }
  }

  const isPending = post.status === "PENDING_APPROVAL";
  const slides = post.media ?? [];
  const reelScript = post.reelScript as unknown as ReelScript | null;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <CardTitle className="text-base">{post.theme ?? "Untitled campaign"}</CardTitle>
            <Badge variant="outline">{TYPE_LABEL[post.postType] ?? post.postType}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Generated {formatRelativeTime(post.createdAt)}</p>
        </div>
        <Badge variant={STATUS_VARIANT[post.status] ?? "outline"}>{post.status.replace("_", " ")}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {post.researchSummary && (
          <p className="rounded-lg border border-line/60 bg-secondary/20 p-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Research: </span>
            {post.researchSummary}
          </p>
        )}

        {post.postType === "CAROUSEL" && slides.length > 0 && <CarouselPreview slides={slides} />}
        {post.postType === "REEL" && reelScript && (
          <ReelPreview coverImageUrl={post.imageUrl} script={reelScript} />
        )}

        <Tabs defaultValue="facebook">
          <TabsList>
            <TabsTrigger value="facebook">Facebook</TabsTrigger>
            <TabsTrigger value="instagram">Instagram</TabsTrigger>
            <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
          </TabsList>
          {PLATFORM_KEYS.map((key) => (
            <TabsContent key={key} value={key}>
              {key === "facebook" && (
                <FacebookPreview
                  brandName={brandName}
                  imageUrl={post.imageUrl ?? ""}
                  caption={flattenCaption(captions.facebook)}
                  hashtags={post.hashtags}
                />
              )}
              {key === "instagram" && (
                <InstagramPreview
                  brandName={brandName}
                  imageUrl={post.imageUrl ?? ""}
                  caption={flattenCaption(captions.instagram)}
                  hashtags={post.hashtags}
                />
              )}
              {key === "linkedin" && (
                <LinkedInPreview
                  brandName={brandName}
                  imageUrl={post.imageUrl ?? ""}
                  caption={flattenCaption(captions.linkedin)}
                  hashtags={post.hashtags}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>

        {isPending && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground">Edit captions</p>
            <div className="grid gap-3 md:grid-cols-3">
              <LocalizedEditor
                label="Facebook"
                value={captions.facebook}
                onChange={(v) => {
                  setCaptions((c) => ({ ...c, facebook: v }));
                  setDirty(true);
                }}
              />
              <LocalizedEditor
                label="Instagram"
                value={captions.instagram}
                onChange={(v) => {
                  setCaptions((c) => ({ ...c, instagram: v }));
                  setDirty(true);
                }}
              />
              <LocalizedEditor
                label="LinkedIn"
                value={captions.linkedin}
                onChange={(v) => {
                  setCaptions((c) => ({ ...c, linkedin: v }));
                  setDirty(true);
                }}
              />
            </div>
            {dirty && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy === "edit"}
                onClick={() => patch("edit", { captions }).then(() => setDirty(false))}
              >
                {busy === "edit" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save edits
              </Button>
            )}
          </div>
        )}
      </CardContent>
      {isPending && (
        <CardFooter className="flex-wrap gap-2">
          <Button size="sm" onClick={() => patch("approve")} disabled={!!busy}>
            {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Approve & publish
          </Button>
          <Button size="sm" variant="outline" onClick={() => patch("regenerate-image")} disabled={!!busy}>
            {busy === "regenerate-image" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )}
            Regenerate image{post.postType === "CAROUSEL" ? "s" : ""}
          </Button>
          <Button size="sm" variant="outline" onClick={() => patch("regenerate")} disabled={!!busy}>
            {busy === "regenerate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Full regenerate
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setRejectOpen(true)} disabled={!!busy}>
            <X className="h-4 w-4" /> Reject
          </Button>
        </CardFooter>
      )}
      {!isPending && post.postType === "REEL" && (
        <CardFooter>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Reels publish as a feed post with the cover image — no video
            renderer is wired up, so use the script above to produce the real video yourself.
          </p>
        </CardFooter>
      )}

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this post?</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Optional: why are you rejecting this? (helps future generations)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await patch("reject", { rejectionReason: rejectReason });
                setRejectOpen(false);
              }}
            >
              Reject post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
