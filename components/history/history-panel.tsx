"use client";

import { useEffect, useState } from "react";
import type { AgentRun, GeneratedPost } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatRelativeTime } from "@/lib/utils";
import { useBrand } from "@/components/providers/brand-provider";

const RUN_STATUS_VARIANT: Record<string, "success" | "destructive" | "secondary"> = {
  COMPLETED: "success",
  FAILED: "destructive",
  RUNNING: "secondary",
};

const POST_STATUS_VARIANT: Record<string, "success" | "destructive" | "secondary" | "warning"> = {
  PUBLISHED: "success",
  FAILED: "destructive",
  REJECTED: "destructive",
  APPROVED: "secondary",
  PUBLISHING: "secondary",
  PENDING_APPROVAL: "warning",
  REGENERATING: "secondary",
};

type RunWithBrand = AgentRun & { brand?: { name: string } };
type PostWithBrand = GeneratedPost & { brand?: { name: string } };

export function HistoryPanel() {
  const { brands, currentBrandId } = useBrand();
  const [filterId, setFilterId] = useState<string>("all");
  const [runs, setRuns] = useState<RunWithBrand[]>([]);
  const [posts, setPosts] = useState<PostWithBrand[]>([]);

  useEffect(() => {
    if (currentBrandId) setFilterId(currentBrandId);
  }, [currentBrandId]);

  useEffect(() => {
    const query = filterId === "all" ? "" : `?brandId=${filterId}`;
    fetch(`/api/agent/runs${query}`).then((r) => r.json()).then((d) => setRuns(d.runs ?? []));
    fetch(`/api/posts${query}`).then((r) => r.json()).then((d) => setPosts(d.posts ?? []));
  }, [filterId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">History</h1>
          <p className="text-sm text-muted-foreground">Past agent runs and every post the agent has drafted.</p>
        </div>
        <Select value={filterId} onValueChange={setFilterId}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All brands</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="runs">Agent runs</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-3">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm">{post.theme ?? "Untitled"}</CardTitle>
                    {filterId === "all" && post.brand && (
                      <Badge variant="outline">{post.brand.name}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{formatRelativeTime(post.createdAt)}</p>
                </div>
                <Badge variant={POST_STATUS_VARIANT[post.status] ?? "outline"}>{post.status.replace("_", " ")}</Badge>
              </CardHeader>
              {post.publishResults != null && (
                <CardContent className="pt-0 text-xs text-muted-foreground">
                  {JSON.stringify(post.publishResults)}
                </CardContent>
              )}
            </Card>
          ))}
          {posts.length === 0 && <p className="text-sm text-muted-foreground">No posts yet.</p>}
        </TabsContent>

        <TabsContent value="runs" className="space-y-3">
          {runs.map((run) => (
            <Card key={run.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm">
                      {run.trigger === "manual" ? "Manual run" : "Scheduled run"}
                    </CardTitle>
                    {filterId === "all" && run.brand && <Badge variant="outline">{run.brand.name}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(run.startedAt)} · {run.postsGenerated} post{run.postsGenerated === 1 ? "" : "s"}
                  </p>
                </div>
                <Badge variant={RUN_STATUS_VARIANT[run.status] ?? "outline"}>{run.status}</Badge>
              </CardHeader>
              {run.error && (
                <CardContent className="pt-0 text-xs text-rose">{run.error}</CardContent>
              )}
            </Card>
          ))}
          {runs.length === 0 && <p className="text-sm text-muted-foreground">No agent runs yet.</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
