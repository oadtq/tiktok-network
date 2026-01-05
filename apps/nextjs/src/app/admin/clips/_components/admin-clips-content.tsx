"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Bot,
  Check,
  FileVideo,
  Home,
  LayoutDashboard,
  LogOut,
  Play,
  RefreshCw,
  Smartphone,
  Users,
  Video,
  X,
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

type StatusFilter =
  | "all"
  | "draft"
  | "pending"
  | "approved"
  | "published"
  | "failed";

const statusLabels: Record<StatusFilter, string> = {
  all: "All",
  draft: "Draft",
  pending: "Pending",
  approved: "Approved",
  published: "Published",
  failed: "Failed",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
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

interface ApproveModalState {
  isOpen: boolean;
  clipId: string | null;
  title: string;
  description: string;
}

export function AdminClipsContent({ user }: AdminClipsContentProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [modal, setModal] = useState<ApproveModalState>({
    isOpen: false,
    clipId: null,
    title: "",
    description: "",
  });

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const {
    data: clipsData,
    isLoading,
    refetch,
  } = useQuery(
    trpc.admin.allClips.queryOptions(
      statusFilter === "all" ? undefined : { status: statusFilter },
    ),
  );

  const pendingCount =
    clipsData?.clips.filter((c) => c.status === "pending").length ?? 0;

  const approveMutation = useMutation(
    trpc.admin.approveClip.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.admin.allClips.queryKey(),
        });
        closeModal();
      },
    }),
  );

  const openModal = (clip: {
    id: string;
    title: string;
    description: string | null;
  }) => {
    setModal({
      isOpen: true,
      clipId: clip.id,
      title: clip.title,
      description: clip.description ?? "",
    });
  };

  const closeModal = () => {
    setModal({
      isOpen: false,
      clipId: null,
      title: "",
      description: "",
    });
  };

  const handleApprove = () => {
    if (modal.clipId) {
      approveMutation.mutate({
        clipId: modal.clipId,
        title: modal.title,
        description: modal.description,
      });
    }
  };

  return (
    <div className="bg-background flex min-h-screen">
      {/* Sidebar */}
      <aside className="border-border bg-sidebar sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r">
        {/* Logo */}
        <div className="border-border flex h-16 items-center gap-3 border-b px-6">
          <div className="bg-primary flex size-8 items-center justify-center rounded-lg">
            <LayoutDashboard className="text-primary-foreground size-4" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Admin</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          <NavItem icon={Home} label="Dashboard" href="/admin" />
          <NavItem
            icon={Smartphone}
            label="Cloud Phones"
            href="/admin/cloud-phones"
          />
          <NavItem icon={Users} label="Users" href="/admin/users" />
          <NavItem
            icon={FileVideo}
            label="All Clips"
            active
            href="/admin/clips"
            badge={pendingCount > 0 ? pendingCount : undefined}
          />
          <NavItem icon={BarChart3} label="Analytics" href="/admin/analytics" />
          <NavItem icon={Bot} label="Automations" href="/admin/automations" />

          <div className="border-border my-4 border-t" />

          <p className="text-muted-foreground mb-2 px-3 text-xs font-medium tracking-wider uppercase">
            Switch View
          </p>
          <NavItem icon={Video} label="Creator Dashboard" href="/dashboard" />
        </nav>

        {/* User Profile */}
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
        <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 border-b backdrop-blur">
          <div className="flex h-16 items-center justify-between px-8">
            <div>
              <h1 className="text-foreground text-xl font-semibold">
                All Clips
              </h1>
              <p className="text-muted-foreground text-sm">
                View and manage all clips ({clipsData?.total ?? 0} total)
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => void refetch()}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`size-4 ${isLoading ? "animate-spin" : ""}`}
                />
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
                className={`rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  statusFilter === status
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {statusLabels[status]}
                {status === "pending" && pendingCount > 0 && (
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="text-muted-foreground size-8 animate-spin" />
            </div>
          ) : clipsData?.clips.length === 0 ? (
            <div className="border-border bg-card flex flex-col items-center justify-center rounded-xl border py-16">
              <Video className="text-muted-foreground size-12" />
              <h3 className="text-foreground mt-4 text-lg font-semibold">
                No clips found
              </h3>
              <p className="text-muted-foreground mt-1 text-sm">
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
                  className="border-border bg-card overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* Video Preview */}
                  <div className="bg-muted relative aspect-video">
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
                    <div className="absolute top-2 right-2">
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
                    <h3 className="text-foreground line-clamp-1 font-semibold">
                      {clip.title}
                    </h3>
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                      {clip.description ?? "No description"}
                    </p>

                    {/* Uploader Info */}
                    <div className="bg-muted/50 mt-3 flex items-center gap-2 rounded-lg px-3 py-2">
                      <div className="flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-medium text-white">
                        {clip.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-foreground truncate text-sm font-medium">
                          {clip.user.name}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          {clip.user.email}
                        </p>
                      </div>
                    </div>

                    {clip.tiktokAccount && (
                      <div className="text-muted-foreground mt-2 flex items-center gap-1 text-xs">
                        <Video className="size-3" />@
                        {clip.tiktokAccount.tiktokUsername}
                      </div>
                    )}

                    <div className="text-muted-foreground mt-2 text-xs">
                      Created: {new Date(clip.createdAt).toLocaleDateString()}
                    </div>

                    {/* Approve Button for Pending */}
                    {clip.status === "pending" && (
                      <div className="mt-4">
                        <Button
                          size="sm"
                          className="w-full gap-1"
                          onClick={() => openModal(clip)}
                        >
                          <Check className="size-3" />
                          Review & Approve
                        </Button>
                      </div>
                    )}

                    {/* Stats for published */}
                    {clip.latestStats && (
                      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                        <div>
                          <p className="text-foreground text-sm font-semibold">
                            {clip.latestStats.views.toLocaleString()}
                          </p>
                          <p className="text-muted-foreground text-xs">Views</p>
                        </div>
                        <div>
                          <p className="text-foreground text-sm font-semibold">
                            {clip.latestStats.likes.toLocaleString()}
                          </p>
                          <p className="text-muted-foreground text-xs">Likes</p>
                        </div>
                        <div>
                          <p className="text-foreground text-sm font-semibold">
                            {clip.latestStats.comments.toLocaleString()}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Comments
                          </p>
                        </div>
                        <div>
                          <p className="text-foreground text-sm font-semibold">
                            {clip.latestStats.shares.toLocaleString()}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Shares
                          </p>
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

      {/* Approve Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card w-full max-w-lg rounded-xl p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-foreground text-lg font-semibold">
                Review & Approve
              </h2>
              <button
                onClick={closeModal}
                className="text-muted-foreground hover:bg-accent rounded-lg p-2"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-foreground mb-2 block text-sm font-medium">
                  Title
                </label>
                <input
                  type="text"
                  value={modal.title}
                  onChange={(e) =>
                    setModal((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="border-border bg-background text-foreground focus:border-primary focus:ring-primary w-full rounded-lg border px-4 py-2.5 focus:ring-1 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-foreground mb-2 block text-sm font-medium">
                  Description (TikTok Caption)
                </label>
                <textarea
                  value={modal.description}
                  onChange={(e) =>
                    setModal((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={4}
                  className="border-border bg-background text-foreground focus:border-primary focus:ring-primary w-full rounded-lg border px-4 py-2.5 focus:ring-1 focus:outline-none"
                />
              </div>

              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm text-emerald-800">
                  Approving will create a publish task on GeeLark. The video
                  will be published to TikTok via the linked cloud phone.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={closeModal}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                  className="flex-1"
                >
                  {approveMutation.isPending
                    ? "Approving..."
                    : "Approve & Publish"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
