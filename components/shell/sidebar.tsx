"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Building2,
  Share2,
  History,
  Settings,
  Sparkles,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandSwitcher } from "@/components/brands/brand-switcher";

const NAV_ITEMS = [
  { href: "/" as const, label: "Approvals", icon: LayoutGrid },
  { href: "/brands" as const, label: "Brands", icon: Building2 },
  { href: "/accounts" as const, label: "Accounts", icon: Share2 },
  { href: "/history" as const, label: "History", icon: History },
  { href: "/settings" as const, label: "Settings", icon: Settings },
  { href: "/integrations" as const, label: "Integrations", icon: KeyRound },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line/60 bg-panel/60 px-4 py-6 md:flex">
      <div className="mb-4 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <span className="font-mono-ui text-sm font-semibold tracking-tight">AutoPost AI</span>
      </div>
      <div className="mb-6">
        <BrandSwitcher />
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="rounded-lg border border-line/60 bg-secondary/30 p-3 text-xs text-muted-foreground">
        Every brand runs independently — its own profile, schedule, accounts,
        and generated posts. New drafts land in{" "}
        <span className="text-foreground">Approvals</span> for the selected brand.
      </div>
    </aside>
  );
}
