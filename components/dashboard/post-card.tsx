"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, RefreshCw, X } from "lucide-react";
import type { GeneratedPost } from "@prisma/client";
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
import { formatRelativeTime } from "@/lib/utils";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "warning" | "success" | "destructive"> = {
  PENDING_APPROVAL: "warning",
  APPROVED: "secondary",
  PUBLISHING: "secondary",
  PUBLISHED: "success",
  REJECTED: "destructive",
  FAILED: "destructive",
  REGENERATING: "secondary",
};

export function PostCard({
  post,
  brandName,
  onChanged,
}: {
  post: GeneratedPost;
  brandName: string;
  onChanged: () => void;
}) {
  const [captions, setCaptions] = useState({
    facebookCaption: post.facebookCaption ?? "",
    instagramCaption: post.instagramCaption ?? "",
    linkedinCaption: post.linkedinCaption ?? "",
  });
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
      toast.error(`Couldn't ${action} this post. Please try again.`);
    } finally {
      setBusy(null);
    }
  }

  const isPending = post.status === "PENDING_APPROVAL";

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">{post.theme ?? "Untitled campaign"}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Generated {formatRelativeTime(post.createdAt)}
          </p>
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

        <Tabs defaultValue="facebook">
          <TabsList>
            <TabsTrigger value="facebook">Facebook</TabsTrigger>
            <TabsTrigger value="instagram">Instagram</TabsTrigger>
            <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
          </TabsList>
          <TabsContent value="facebook">
            <FacebookPreview
              brandName={brandName}
              imageUrl={post.imageUrl ?? ""}
              caption={captions.facebookCaption}
              hashtags={post.hashtags}
            />
          </TabsContent>
          <TabsContent value="instagram">
            <InstagramPreview
              brandName={brandName}
              imageUrl={post.imageUrl ?? ""}
              caption={captions.instagramCaption}
              hashtags={post.hashtags}
            />
          </TabsContent>
          <TabsContent value="linkedin">
            <LinkedInPreview
              brandName={brandName}
              imageUrl={post.imageUrl ?? ""}
              caption={captions.linkedinCaption}
              hashtags={post.hashtags}
            />
          </TabsContent>
        </Tabs>

        {isPending && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Edit captions</label>
            <Textarea
              value={captions.facebookCaption}
              onChange={(e) => {
                setCaptions((c) => ({ ...c, facebookCaption: e.target.value }));
                setDirty(true);
              }}
              placeholder="Facebook caption"
              rows={2}
            />
            <Textarea
              value={captions.instagramCaption}
              onChange={(e) => {
                setCaptions((c) => ({ ...c, instagramCaption: e.target.value }));
                setDirty(true);
              }}
              placeholder="Instagram caption"
              rows={2}
            />
            <Textarea
              value={captions.linkedinCaption}
              onChange={(e) => {
                setCaptions((c) => ({ ...c, linkedinCaption: e.target.value }));
                setDirty(true);
              }}
              placeholder="LinkedIn caption"
              rows={2}
            />
            {dirty && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy === "edit"}
                onClick={() => patch("edit", captions).then(() => setDirty(false))}
              >
                {busy === "edit" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save edits
              </Button>
            )}
          </div>
        )}
      </CardContent>
      {isPending && (
        <CardFooter className="gap-2">
          <Button size="sm" onClick={() => patch("approve")} disabled={!!busy}>
            {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Approve & publish
          </Button>
          <Button size="sm" variant="outline" onClick={() => patch("regenerate")} disabled={!!busy}>
            {busy === "regenerate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Regenerate
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setRejectOpen(true)} disabled={!!busy}>
            <X className="h-4 w-4" /> Reject
          </Button>
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
