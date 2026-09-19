"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Facebook, Instagram, Linkedin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBrand } from "@/components/providers/brand-provider";

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

export function AccountsPanel() {
  const { currentBrand, currentBrandId, setCurrentBrandId } = useBrand();
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const searchParams = useSearchParams();

  const load = useCallback(async () => {
    if (!currentBrandId) return;
    const res = await fetch(`/api/social/accounts?brandId=${currentBrandId}`);
    if (res.ok) setAccounts((await res.json()).accounts);
  }, [currentBrandId]);

  useEffect(() => {
    setAccounts(null);
    load();
  }, [load]);

  useEffect(() => {
    // After an OAuth redirect, restore the brand the connection was made
    // for — the popup may have opened before the user switched brands.
    const redirectedBrandId = searchParams.get("brandId");
    if (redirectedBrandId && redirectedBrandId !== currentBrandId) {
      setCurrentBrandId(redirectedBrandId);
    }
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected) toast.success(`${connected} account connected successfully.`);
    if (error) toast.error(`Connection failed: ${error}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function disconnect(id: string) {
    await fetch(`/api/social/accounts/${id}`, { method: "DELETE" });
    await load();
  }

  if (!currentBrand) {
    return (
      <p className="text-sm text-muted-foreground">
        Select or add a brand under <a href="/brands" className="underline">Brands</a> to connect its accounts.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Connected accounts — {currentBrand.name}</h1>
        <p className="text-sm text-muted-foreground">
          Authorize the platforms the agent will publish this brand&apos;s approved posts to.
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
                  <a href={`${meta.connectPath}?brandId=${currentBrandId}`}>
                    Connect {platform === "INSTAGRAM" ? "via Facebook" : ""}
                  </a>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
