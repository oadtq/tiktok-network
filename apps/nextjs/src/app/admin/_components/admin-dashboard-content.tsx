"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, LayoutDashboard, Play, Video, X } from "lucide-react";

import { Button } from "@everylab/ui/button";

import type { NavItem } from "~/components/sidebar";
import { Sidebar } from "~/components/sidebar";
import { adminNavItems } from "~/config/navigation";
import { TRPCReactProvider, useTRPC } from "~/trpc/react";

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
    trpc.admin.pendingClips.queryOptions(),
  );

  // Mutations
  const approveClip = useMutation(
    trpc.admin.approveClip.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.admin.pendingClips.queryKey(),
        });
      },
    }),
  );

  const rejectClip = useMutation(
    trpc.admin.rejectClip.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.admin.pendingClips.queryKey(),
        });
      },
    }),
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
          <h2 className="text-foreground text-lg font-semibold">
            Pending Review
          </h2>
          <p className="text-muted-foreground text-sm">
            {pendingClips.length} clip{pendingClips.length !== 1 ? "s" : ""}{" "}
            waiting for review
          </p>
        </div>
      </div>

      {/* Pending Clips List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="border-border bg-card rounded-xl border p-8 text-center">
            <Clock className="text-muted-foreground mx-auto size-8 animate-spin" />
            <p className="text-muted-foreground mt-4">
              Loading pending clips...
            </p>
          </div>
        ) : pendingClips.length === 0 ? (
          <div className="border-border bg-card rounded-xl border p-8 text-center">
            <Check className="mx-auto size-12 text-emerald-500" />
            <p className="text-foreground mt-4 font-medium">All caught up!</p>
            <p className="text-muted-foreground mt-1">
              No clips pending review
            </p>
          </div>
        ) : (
          pendingClips.map((clip) => (
            <div
              key={clip.id}
              className="border-border bg-card rounded-xl border p-6 shadow-sm"
            >
              <div className="flex items-start gap-6">
                {/* Video Preview Thumbnail */}
                <div
                  onClick={() => setPreviewUrl(clip.videoUrl)}
                  className="group bg-muted relative flex size-32 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg"
                >
                  <Video className="text-muted-foreground size-8" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <Play className="size-8 text-white" />
                  </div>
                </div>

                {/* Clip Details */}
                <div className="min-w-0 flex-1">
                  <h3 className="text-foreground truncate text-lg font-semibold">
                    {clip.title}
                  </h3>
                  <p className="text-muted-foreground mt-1 text-sm">
                    by {clip.user.name} ({clip.user.email})
                  </p>
                  {clip.description && (
                    <p className="text-foreground mt-2 line-clamp-2 text-sm">
                      {clip.description}
                    </p>
                  )}
                  <div className="text-muted-foreground mt-3 flex items-center gap-4 text-sm">
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
                        Scheduled:{" "}
                        {new Date(clip.scheduledAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
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
  return (
    <TRPCReactProvider>
      <AdminDashboardContentInner user={user} />
    </TRPCReactProvider>
  );
}

function AdminDashboardContentInner({ user }: AdminDashboardContentProps) {
  const trpc = useTRPC();

  // Get pending count for badge
  const { data: pendingClips = [] } = useQuery(
    trpc.admin.pendingClips.queryOptions(),
  );

  // Add badge to Dashboard item
  const navItems: NavItem[] = adminNavItems.map((item) => {
    if (item.label === "Dashboard") {
      return { ...item, badge: pendingClips.length };
    }
    return item;
  });

  const bottomContent = (
    <>
      <p className="text-muted-foreground mb-2 px-3 text-xs font-medium tracking-wider uppercase">
        Switch View
      </p>
      <Link
        href="/dashboard"
        className="text-muted-foreground hover:bg-accent hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
      >
        <Video className="size-5" />
        Creator Dashboard
      </Link>
    </>
  );

  return (
    <div className="bg-background flex min-h-screen">
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
