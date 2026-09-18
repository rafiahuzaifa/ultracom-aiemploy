"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Facebook, Instagram, Linkedin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Account {
  id: string;
  platform: "FACEBOOK" | "INSTAGRAM" | "LINKEDIN";
  accountName: string | null;
  accountId: string;
  isActive: boolean;
}

const PLATFORM_META = {
  FACEBOOK: { label: "Facebook Page", icon: Facebook, connectHref: "/api/social/connect/meta" },
  INSTAGRAM: { label: "Instagram Business", icon: Instagram, connectHref: "/api/social/connect/meta" },
  LINKEDIN: { label: "LinkedIn Company Page", icon: Linkedin, connectHref: "/api/social/connect/linkedin" },
} as const;

export function AccountsPanel() {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const searchParams = useSearchParams();

  const load = useCallback(async () => {
    const res = await fetch("/api/social/accounts");
    if (res.ok) setAccounts((await res.json()).accounts);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected) toast.success(`${connected} account connected successfully.`);
    if (error) toast.error(`Connection failed: ${error}`);
  }, [searchParams]);

  async function disconnect(id: string) {
    await fetch(`/api/social/accounts/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Connected accounts</h1>
        <p className="text-sm text-muted-foreground">
          Authorize the platforms the agent will publish approved posts to.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(Object.keys(PLATFORM_META) as Array<keyof typeof PLATFORM_META>).map((platform) => {
          const meta = PLATFORM_META[platform];
          const Icon = meta.icon;
          const connected = accounts?.filter((a) => a.platform === platform) ?? [];
          return (
            <Card key={platform}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  <CardTitle className="text-base">{meta.label}</CardTitle>
                </div>
                <CardDescription>
                  {connected.length > 0 ? `${connected.length} connected` : "Not connected"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {connected.map((acc) => (
                  <div key={acc.id} className="flex items-center justify-between rounded-lg border border-line/60 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{acc.accountName ?? acc.accountId}</p>
                      <Badge variant={acc.isActive ? "success" : "outline"} className="mt-1">
                        {acc.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => disconnect(acc.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" className="w-full" asChild>
                  <a href={meta.connectHref}>Connect {platform === "INSTAGRAM" ? "via Facebook" : ""}</a>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
