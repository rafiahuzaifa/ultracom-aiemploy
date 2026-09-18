"use client";

import { useEffect, useState } from "react";
import type { AgentRun, GeneratedPost } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatRelativeTime } from "@/lib/utils";

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

export function HistoryPanel() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [posts, setPosts] = useState<GeneratedPost[]>([]);

  useEffect(() => {
    fetch("/api/agent/runs").then((r) => r.json()).then((d) => setRuns(d.runs ?? []));
    fetch("/api/posts").then((r) => r.json()).then((d) => setPosts(d.posts ?? []));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">History</h1>
        <p className="text-sm text-muted-foreground">Past agent runs and every post the agent has drafted.</p>
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
                  <CardTitle className="text-sm">{post.theme ?? "Untitled"}</CardTitle>
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
                  <CardTitle className="text-sm">
                    {run.trigger === "manual" ? "Manual run" : "Scheduled run"}
                  </CardTitle>
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
