"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Calendar,
  Check,
  Clock,
  Home,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Play,
  Plus,
  Settings,
  Smartphone,
  TrendingUp,
  Users,
  Video,
  X,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@everylab/ui/button";

import { authClient } from "~/auth/client";
import { useTRPC } from "~/trpc/react";

interface User {
  id: string;
  name: string;
  email: string;
}

interface AdminDashboardContentProps {
  user: User;
}




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

// Review Tab Content
function ReviewTab() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Query for pending clips
  const { data: pendingClips = [], isLoading } = useQuery(
    trpc.admin.pendingClips.queryOptions()
  );

  // Mutations
  const approveClip = useMutation(
    trpc.admin.approveClip.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.admin.pendingClips.queryKey() });
      },
    })
  );

  const rejectClip = useMutation(
    trpc.admin.rejectClip.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.admin.pendingClips.queryKey() });
      },
    })
  );

  const handleApprove = async (clipId: string) => {
    console.log(`[Admin] Approving clip ${clipId}`);
    try {
      await approveClip.mutateAsync({ clipId });
      console.log(`[Admin] Clip ${clipId} approved successfully`);
    } catch (error) {
      console.error(`[Admin] Failed to approve clip ${clipId}:`, error);
    }
  };

  const handleReject = async (clipId: string) => {
    console.log(`[Admin] Rejecting clip ${clipId}`);
    try {
      await rejectClip.mutateAsync({ clipId });
      console.log(`[Admin] Clip ${clipId} rejected successfully`);
    } catch (error) {
      console.error(`[Admin] Failed to reject clip ${clipId}:`, error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Pending Review</h2>
          <p className="text-sm text-muted-foreground">
            {pendingClips.length} clip{pendingClips.length !== 1 ? "s" : ""} waiting for review
          </p>
        </div>
      </div>

      {/* Pending Clips List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Clock className="mx-auto size-8 animate-spin text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Loading pending clips...</p>
          </div>
        ) : pendingClips.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Check className="mx-auto size-12 text-emerald-500" />
            <p className="mt-4 text-foreground font-medium">All caught up!</p>
            <p className="mt-1 text-muted-foreground">No clips pending review</p>
          </div>
        ) : (
          pendingClips.map((clip) => (
            <div
              key={clip.id}
              className="rounded-xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex items-start gap-6">
                {/* Video Preview Thumbnail */}
                <div
                  onClick={() => setPreviewUrl(clip.videoUrl)}
                  className="relative cursor-pointer group flex size-32 shrink-0 items-center justify-center rounded-lg bg-muted overflow-hidden"
                >
                  <Video className="size-8 text-muted-foreground" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="size-8 text-white" />
                  </div>
                </div>

                {/* Clip Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-foreground truncate">
                    {clip.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    by {clip.user.name} ({clip.user.email})
                  </p>
                  {clip.description && (
                    <p className="mt-2 text-sm text-foreground line-clamp-2">
                      {clip.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {new Date(clip.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {clip.scheduledAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        Scheduled: {new Date(clip.scheduledAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => handleApprove(clip.id)}
                    disabled={approveClip.isPending || rejectClip.isPending}
                    className="gap-2"
                  >
                    <Check className="size-4" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleReject(clip.id)}
                    disabled={approveClip.isPending || rejectClip.isPending}
                    className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <X className="size-4" />
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Video Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="relative max-h-[80vh] max-w-[80vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X className="size-6" />
            </button>
            <video
              src={previewUrl}
              controls
              autoPlay
              className="max-h-[80vh] max-w-[80vw] rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminDashboardContent({ user }: AdminDashboardContentProps) {
  const trpc = useTRPC();

  // Get pending count for badge
  const { data: pendingClips = [] } = useQuery(trpc.admin.pendingClips.queryOptions());

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
          <NavItem icon={Home} label="Dashboard" active href="/admin" badge={pendingClips.length} />
          <NavItem icon={BarChart3} label="Statistics" href="/admin/statistics" />

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
              onClick={() => {
                void authClient.signOut().then(() => {
                  window.location.href = "/";
                });
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
        {/* <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center px-8">
            <h1 className="text-xl font-semibold text-foreground">Admin Dashboard</h1>
          </div>
        </header> */}

        <div className="p-8">
          <ReviewTab />
        </div>
      </main>
    </div>
  );
}
