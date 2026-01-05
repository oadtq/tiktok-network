"use client";

import { useState } from "react";
import {
  Check,
  Clock,
  LayoutDashboard,
  Play,
  Video,
  X,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@everylab/ui/button";

import { useTRPC } from "~/trpc/react";
import { Sidebar } from "~/components/sidebar";
import type { NavItem } from "~/components/sidebar";
import { adminNavItems } from "~/config/navigation";
import Link from "next/link";

interface User {
  id: string;
  name: string;
  email: string;
}

interface AdminDashboardContentProps {
  user: User;
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
                        <Clock className="size-3" />
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

  // Add badge to Dashboard item
  const navItems: NavItem[] = adminNavItems.map((item) => {
    if (item.label === "Dashboard") {
      return { ...item, badge: pendingClips.length };
    }
    return item;
  });

  const bottomContent = (
    <>
      <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Switch View
      </p>
      <Link
        href="/dashboard"
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Video className="size-5" />
        Creator Dashboard
      </Link>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        user={{ ...user, role: "admin" }}
        title="Admin"
        logoIcon={LayoutDashboard}
        items={navItems}
        bottomContent={bottomContent}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <ReviewTab />
        </div>
      </main>
    </div>
  );
}
