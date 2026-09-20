"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useBrand } from "@/components/providers/brand-provider";
import { BackLink } from "@/components/shell/back-link";
import { SocialConnectGrid } from "@/components/accounts/social-connect-grid";

export function AccountsPanel() {
  const { currentBrand, currentBrandId, setCurrentBrandId } = useBrand();
  const searchParams = useSearchParams();

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

  if (!currentBrand || !currentBrandId) {
    return (
      <p className="text-sm text-muted-foreground">
        Select or add a brand under <a href="/brands" className="underline">Brands</a> to connect its accounts.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <BackLink />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Connected accounts — {currentBrand.name}</h1>
        <p className="text-sm text-muted-foreground">
          Authorize the platforms the agent will publish this brand&apos;s approved posts to.
        </p>
      </div>

      <SocialConnectGrid brandId={currentBrandId} />
    </div>
  );
}
