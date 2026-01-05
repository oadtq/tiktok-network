"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BarChart3,
  Clock,
  Edit,
  Eye,
  Home,
  LayoutDashboard,
  LogOut,
  Play,
  RefreshCw,
  Settings,
  Trash2,
  Upload,
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

interface ClipsContentProps {
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

export function ClipsContent({ user }: ClipsContentProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; clipId: string | null; title: string }>({
    isOpen: false,
    clipId: null,
    title: "",
  });

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: clips, isLoading, refetch } = useQuery(
    trpc.clip.list.queryOptions(
      statusFilter === "all" ? undefined : { status: statusFilter }
    )
  );

  const deleteMutation = useMutation(
    trpc.clip.delete.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.clip.list.queryKey() });
        setDeleteModal({ isOpen: false, clipId: null, title: "" });
      },
    })
  );

  const withdrawMutation = useMutation(
    trpc.clip.withdraw.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.clip.list.queryKey() });
      },
    })
  );

  const handleDelete = () => {
    if (deleteModal.clipId) {
      deleteMutation.mutate({ id: deleteModal.clipId });
    }
  };

  const handleWithdraw = (clipId: string) => {
    withdrawMutation.mutate({ id: clipId });
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-border bg-sidebar">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-border px-6">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <LayoutDashboard className="size-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Creator</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          <NavItem icon={Home} label="Dashboard" href="/dashboard" />
          <NavItem icon={Upload} label="Upload" href="/dashboard/upload" />
          <NavItem icon={Video} label="My Clips" active href="/dashboard/clips" />
          <NavItem icon={Clock} label="Scheduled" href="/dashboard/scheduled" />
          <NavItem icon={BarChart3} label="Analytics" href="/dashboard/analytics" />
          <NavItem icon={Settings} label="Settings" href="/dashboard/settings" />
        </nav>

        {/* User Profile */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-medium text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-foreground">
                {user.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">Creator</p>
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
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <ArrowLeft className="size-5" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  My Clips
                </h1>
                <p className="text-sm text-muted-foreground">
                  Manage all your uploaded videos
                </p>
              </div>
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
              <Link href="/dashboard/upload">
                <Button className="gap-2">
                  <Upload className="size-4" />
                  Upload New
                </Button>
              </Link>
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
          ) : clips?.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
              <Video className="size-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                No clips found
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {statusFilter === "all"
                  ? "Upload your first video to get started"
                  : `No clips with status "${statusLabels[statusFilter]}"`}
              </p>
              {statusFilter === "all" && (
                <Link href="/dashboard/upload" className="mt-4">
                  <Button className="gap-2">
                    <Upload className="size-4" />
                    Upload Video
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {clips?.map((clip) => (
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

                    {clip.tiktokAccount && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <Video className="size-3" />
                        @{clip.tiktokAccount.tiktokUsername}
                      </div>
                    )}

                    <div className="mt-2 text-xs text-muted-foreground">
                      Created: {new Date(clip.createdAt).toLocaleDateString()}
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1"
                        asChild
                      >
                        <Link href={`/dashboard/clips/${clip.id}`}>
                          <Eye className="size-3" />
                          View
                        </Link>
                      </Button>
                      {clip.status === "draft" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          asChild
                        >
                          <Link href={`/dashboard/clips/${clip.id}/edit`}>
                            <Edit className="size-3" />
                          </Link>
                        </Button>
                      )}
                      {clip.status === "submitted" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => handleWithdraw(clip.id)}
                          disabled={withdrawMutation.isPending}
                        >
                          <X className="size-3" />
                          Withdraw
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() =>
                          setDeleteModal({
                            isOpen: true,
                            clipId: clip.id,
                            title: clip.title,
                          })
                        }
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground">
              Delete Clip
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete "{deleteModal.title}"? This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteModal({ isOpen: false, clipId: null, title: "" })}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
