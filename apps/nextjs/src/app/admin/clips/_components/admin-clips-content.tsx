"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Clock,
  FileVideo,
  Home,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Play,
  RefreshCw,
  Smartphone,
  Users,
  Video,
} from "lucide-react";

import { Button } from "@everylab/ui/button";

import { authClient } from "~/auth/client";
import { useTRPC } from "~/trpc/react";

interface User {
  id: string;
  name: string;
  email: string;
}

interface AdminClipsContentProps {
  user: User;
}

type StatusFilter = "all" | "draft" | "submitted" | "approved" | "rejected" | "publishing" | "published" | "failed";

const statusLabels: Record<StatusFilter, string> = {
  all: "All",
  draft: "Draft",
  submitted: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  publishing: "Publishing",
  published: "Published",
  failed: "Failed",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  publishing: "bg-blue-100 text-blue-700",
  published: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

// Navigation Item Component
function NavItem({
  icon: Icon,
  label,
  active = false,
  href = "#",
  badge,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  href?: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className="size-5" />
        {label}
      </div>
      {badge !== undefined && badge > 0 && (
        <span
          className={`flex size-5 items-center justify-center rounded-full text-xs font-medium ${
            active
              ? "bg-primary-foreground/20 text-primary-foreground"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

export function AdminClipsContent({ user }: AdminClipsContentProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const trpc = useTRPC();

  const { data: clipsData, isLoading, refetch } = useQuery(
    trpc.admin.allClips.queryOptions(
      statusFilter === "all" ? undefined : { status: statusFilter }
    )
  );

  // For pending badge count
  const { data: pendingClips } = useQuery(
    trpc.admin.pendingClips.queryOptions()
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-border bg-sidebar">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-border px-6">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <LayoutDashboard className="size-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Admin</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          <NavItem icon={Home} label="Dashboard" href="/admin" />
          <NavItem icon={Smartphone} label="Cloud Phones" href="/admin/cloud-phones" />
          <NavItem icon={Users} label="Users" href="/admin/users" />
          <NavItem icon={FileVideo} label="All Clips" active href="/admin/clips" />
          <NavItem
            icon={Clock}
            label="Submissions"
            href="/admin/submissions"
            badge={pendingClips?.length}
          />
          <NavItem icon={Megaphone} label="Campaigns" href="/admin/campaigns" />
          <NavItem icon={BarChart3} label="Analytics" href="/admin/analytics" />

          <div className="my-4 border-t border-border" />

          <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Switch View
          </p>
          <NavItem icon={Video} label="Creator Dashboard" href="/dashboard" />
        </nav>

        {/* User Profile */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-medium text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-foreground">
                {user.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">Admin</p>
            </div>
            <button
              onClick={async () => {
                await authClient.signOut();
                window.location.href = "/";
              }}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center justify-between px-8">
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                All Clips
              </h1>
              <p className="text-sm text-muted-foreground">
                View all clips uploaded by users ({clipsData?.total ?? 0} total)
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => void refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </header>

        <div className="p-8">
          {/* Status Filter Tabs */}
          <div className="mb-6 flex gap-2 overflow-x-auto">
            {(Object.keys(statusLabels) as StatusFilter[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {statusLabels[status]}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : clipsData?.clips.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
              <Video className="size-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                No clips found
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {statusFilter === "all"
                  ? "No clips have been uploaded yet"
                  : `No clips with status "${statusLabels[statusFilter]}"`}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {clipsData?.clips.map((clip) => (
                <div
                  key={clip.id}
                  className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* Video Preview */}
                  <div className="relative aspect-video bg-muted">
                    <video
                      src={clip.videoUrl}
                      className="size-full object-cover"
                      muted
                      playsInline
                    />
                    <button className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity hover:opacity-100">
                      <Play className="size-12 text-white" />
                    </button>
                    {/* Status Badge */}
                    <div className="absolute right-2 top-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          statusColors[clip.status]
                        }`}
                      >
                        {statusLabels[clip.status as StatusFilter]}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="line-clamp-1 font-semibold text-foreground">
                      {clip.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {clip.description ?? "No description"}
                    </p>

                    {/* Uploader Info - Prominent */}
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                      <div className="flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-medium text-white">
                        {clip.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm font-medium text-foreground">
                          {clip.user.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {clip.user.email}
                        </p>
                      </div>
                    </div>

                    {clip.tiktokAccount && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <Video className="size-3" />
                        @{clip.tiktokAccount.tiktokUsername}
                      </div>
                    )}

                    <div className="mt-2 text-xs text-muted-foreground">
                      Created: {new Date(clip.createdAt).toLocaleDateString()}
                    </div>

                    {/* Stats if available */}
                    {clip.latestStats && (
                      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {clip.latestStats.views.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">Views</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {clip.latestStats.likes.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">Likes</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {clip.latestStats.comments.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">Comments</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {clip.latestStats.shares.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">Shares</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
