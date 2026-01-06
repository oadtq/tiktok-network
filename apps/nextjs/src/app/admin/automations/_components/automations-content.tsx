"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Bot,
  FileVideo,
  Home,
  LayoutDashboard,
  Loader2,
  LogOut,
  RefreshCw,
  Smartphone,
  Users,
  Video,
} from "lucide-react";

import { Button } from "@everylab/ui/button";

import { authClient } from "~/auth/client";
import { useTRPC } from "~/trpc/react";
import { AvailableAutomations } from "./available-automations";
import { RecentTaskLogs } from "./recent-task-logs";

interface User {
  id: string;
  name: string;
  email: string;
}

function NavItem({
  icon: Icon,
  label,
  active = false,
  href = "#",
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      <Icon className="size-5" />
      {label}
    </Link>
  );
}

export function AutomationsContent({ user }: { user: User }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Refresh from GeeLark mutation
  const refreshMutation = useMutation(
    trpc.admin.refreshTasksFromGeeLark.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.admin.getTasks.queryKey(),
        });
      },
    }),
  );

  return (
    <div className="bg-background flex min-h-screen">
      {/* Sidebar */}
      <aside className="border-border bg-sidebar sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r">
        <div className="border-border flex h-16 items-center gap-3 border-b px-6">
          <div className="bg-primary flex size-8 items-center justify-center rounded-lg">
            <LayoutDashboard className="text-primary-foreground size-4" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Admin</span>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          <NavItem icon={Home} label="Dashboard" href="/admin" />
          <NavItem
            icon={Smartphone}
            label="Cloud Phones"
            href="/admin/cloud-phones"
          />
          <NavItem icon={Users} label="Users" href="/admin/users" />
          <NavItem icon={FileVideo} label="All Clips" href="/admin/clips" />
          <NavItem icon={BarChart3} label="Analytics" href="/admin/analytics" />
          <NavItem
            icon={Bot}
            label="Automations"
            active
            href="/admin/automations"
          />

          <div className="border-border my-4 border-t" />
          <p className="text-muted-foreground mb-2 px-3 text-xs font-medium tracking-wider uppercase">
            Switch View
          </p>
          <NavItem icon={Video} label="Creator Dashboard" href="/dashboard" />
        </nav>

        <div className="border-border border-t p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-medium text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-foreground truncate text-sm font-medium">
                {user.name}
              </p>
              <p className="text-muted-foreground truncate text-xs">Admin</p>
            </div>
            <button
              onClick={async () => {
                await authClient.signOut();
                window.location.href = "/";
              }}
              className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg p-2 transition-colors"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="border-border bg-background/95 sticky top-0 z-10 border-b backdrop-blur">
          <div className="flex h-16 items-center justify-between px-8">
            <div>
              <h1 className="text-foreground text-xl font-semibold">
                Automations
              </h1>
              <p className="text-muted-foreground text-sm">
                GeeLark automation tasks for TikTok
              </p>
            </div>
            <Button
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
              variant="outline"
              size="sm"
            >
              {refreshMutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 size-4" />
              )}
              Refresh from GeeLark
            </Button>
          </div>
        </header>

        <div className="p-8">
          <AvailableAutomations />
          <RecentTaskLogs />
        </div>
      </main>
    </div>
  );
}
