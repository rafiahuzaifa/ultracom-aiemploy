"use client";

import Link from "next/link";
import { Check, ChevronsUpDown, Plus, Settings2 } from "lucide-react";
import { useBrand } from "@/components/providers/brand-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

export function BrandSwitcher() {
  const { brands, currentBrand, currentBrandId, setCurrentBrandId, loading } = useBrand();

  if (loading) return <Skeleton className="h-10 w-full" />;

  if (brands.length === 0) {
    return (
      <Link
        href="/brands"
        className="flex items-center gap-2 rounded-lg border border-dashed border-line/60 px-3 py-2 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground"
      >
        <Plus className="h-4 w-4" /> Add your first brand
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center justify-between rounded-lg border border-line/60 bg-secondary/30 px-3 py-2 text-left text-sm font-medium hover:bg-secondary/50">
          <span className="truncate">{currentBrand?.name ?? "Select a brand"}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Your brands</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {brands.map((brand) => (
          <DropdownMenuItem
            key={brand.id}
            onClick={() => setCurrentBrandId(brand.id)}
            className="flex items-center justify-between"
          >
            <span className="truncate">{brand.name}</span>
            {brand.id === currentBrandId && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/brands" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" /> Manage brands
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
