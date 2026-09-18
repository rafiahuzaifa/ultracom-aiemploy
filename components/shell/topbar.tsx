"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { Bell, Loader2, LogOut, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRelativeTime } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export function Topbar() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const res = await fetch("/api/notifications");
      if (!res.ok || !active) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
    }
    load();
    const interval = setInterval(load, 30_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  async function handleTrigger() {
    setTriggering(true);
    try {
      const res = await fetch("/api/agent/trigger", { method: "POST" });
      if (!res.ok) throw new Error("Failed to trigger agent");
      toast.success("Agent run started — new drafts will appear shortly.");
    } catch {
      toast.error("Could not start the agent run. Check your API keys and try again.");
    } finally {
      setTriggering(false);
    }
  }

  const initials = session?.user?.name?.slice(0, 2).toUpperCase() ?? "SF";

  return (
    <header className="flex h-16 items-center justify-between border-b border-line/60 bg-panel/40 px-6">
      <div className="font-mono-ui text-xs uppercase tracking-widest text-muted-foreground">
        Marketing Agent
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={handleTrigger} disabled={triggering}>
          {triggering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Run agent now
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 && (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                You&apos;re all caught up.
              </div>
            )}
            {notifications.slice(0, 8).map((n) => (
              <DropdownMenuItem key={n.id} className="flex-col items-start gap-0.5">
                <span className="text-sm font-medium">{n.title}</span>
                {n.body && <span className="line-clamp-2 text-xs text-muted-foreground">{n.body}</span>}
                <span className="text-[10px] text-muted-foreground">{formatRelativeTime(n.createdAt)}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button>
              <Avatar>
                <AvatarImage src={session?.user?.image ?? undefined} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{session?.user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
