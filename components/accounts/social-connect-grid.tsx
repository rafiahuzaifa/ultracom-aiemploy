"use client";

import { useCallback, useEffect, useState } from "react";
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
  FACEBOOK: { label: "Facebook Page", icon: Facebook, connectPath: "/api/social/connect/meta" },
  INSTAGRAM: { label: "Instagram Business", icon: Instagram, connectPath: "/api/social/connect/meta" },
  LINKEDIN: { label: "LinkedIn Company Page", icon: Linkedin, connectPath: "/api/social/connect/linkedin" },
} as const;

/**
 * The Facebook/Instagram/LinkedIn connection grid for one brand. Shared
 * between the dedicated Accounts page and the inline "manage accounts"
 * section on each Brand card, so connecting accounts never requires leaving
 * the brand you're setting up.
 */
export function SocialConnectGrid({ brandId }: { brandId: string }) {
  const [accounts, setAccounts] = useState<Account[] | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/social/accounts?brandId=${brandId}`);
    if (res.ok) setAccounts((await res.json()).accounts);
  }, [brandId]);

  useEffect(() => {
    setAccounts(null);
    load();
  }, [load]);

  async function disconnect(id: string) {
    await fetch(`/api/social/accounts/${id}`, { method: "DELETE" });
    await load();
  }

  return (
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
                <a href={`${meta.connectPath}?brandId=${brandId}`}>
                  Connect {platform === "INSTAGRAM" ? "via Facebook" : ""}
                </a>
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
