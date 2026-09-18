"use client";

import { useCallback, useEffect, useState } from "react";
import { Inbox } from "lucide-react";
import type { GeneratedPost, Website } from "@prisma/client";
import { PostCard } from "@/components/dashboard/post-card";
import { Skeleton } from "@/components/ui/skeleton";

export function Dashboard() {
  const [posts, setPosts] = useState<GeneratedPost[] | null>(null);
  const [website, setWebsite] = useState<Website | null>(null);

  const load = useCallback(async () => {
    const [postsRes, websitesRes] = await Promise.all([
      fetch("/api/posts?status=PENDING_APPROVAL"),
      fetch("/api/websites"),
    ]);
    if (postsRes.ok) setPosts((await postsRes.json()).posts);
    if (websitesRes.ok) {
      const data = await websitesRes.json();
      setWebsite(data.websites?.find((w: Website) => w.isPrimary) ?? data.websites?.[0] ?? null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const brandName = website?.name || website?.url?.replace(/^https?:\/\//, "") || "Your Brand";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Pending approval</h1>
        <p className="text-sm text-muted-foreground">
          Review AI-generated ad posts before they go live on Facebook, Instagram, and LinkedIn.
        </p>
      </div>

      {posts === null && (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-96 w-full" />
          ))}
        </div>
      )}

      {posts?.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line/60 py-24 text-center">
          <Inbox className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">No posts waiting for review</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Connect a website and run the agent to generate your first batch of ad concepts.
          </p>
        </div>
      )}

      {posts && posts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} brandName={brandName} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}
