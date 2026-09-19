"use client";

import { useCallback, useEffect, useState } from "react";
import { Inbox } from "lucide-react";
import type { GeneratedPost, PostMedia } from "@prisma/client";
import { PostCard } from "@/components/dashboard/post-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBrand } from "@/components/providers/brand-provider";

type PostWithMedia = GeneratedPost & { media: PostMedia[] };

export function Dashboard() {
  const { currentBrand, currentBrandId, loading: brandLoading } = useBrand();
  const [posts, setPosts] = useState<PostWithMedia[] | null>(null);

  const load = useCallback(async () => {
    if (!currentBrandId) return;
    const res = await fetch(`/api/posts?brandId=${currentBrandId}&status=PENDING_APPROVAL`);
    if (res.ok) setPosts((await res.json()).posts);
  }, [currentBrandId]);

  useEffect(() => {
    setPosts(null);
    load();
  }, [load]);

  if (brandLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-96 w-full" />
        ))}
      </div>
    );
  }

  if (!currentBrand) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line/60 py-24 text-center">
        <Inbox className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="font-medium">No brand selected</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Add a brand under <a href="/brands" className="underline">Brands</a> to get started.
        </p>
      </div>
    );
  }

  const brandName = currentBrand.name;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Pending approval — {brandName}</h1>
        <p className="text-sm text-muted-foreground">
          Review AI-generated posts before they go live on {brandName}&apos;s Facebook, Instagram, and LinkedIn.
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
            Run the agent for {brandName} to generate your first batch of post concepts.
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
