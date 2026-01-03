"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Calendar,
  Check,
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

interface PendingContentProps {
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

interface ClipModalState {
  isOpen: boolean;
  clipId: string | null;
  title: string;
  description: string;
}

export function PendingContent({ user }: PendingContentProps) {
  const [modal, setModal] = useState<ClipModalState>({
    isOpen: false,
    clipId: null,
    title: "",
    description: "",
  });

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: pendingClips, isLoading, refetch } = useQuery(
    trpc.admin.pendingClips.queryOptions()
  );

  const approveMutation = useMutation(
    trpc.admin.approveClip.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.admin.pendingClips.queryKey() });
        closeModal();
      },
    })
  );

  const openModal = (clip: { id: string; title: string; description: string | null }) => {
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
          <NavItem icon={FileVideo} label="All Clips" href="/admin/clips" />
          <NavItem
            icon={Clock}
            label="Pending Review"
            active
            href="/admin/pending"
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
                Pending Review
              </h1>
              <p className="text-sm text-muted-foreground">
                Review and approve submitted clips for publishing
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
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : pendingClips?.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
              <Check className="size-12 text-emerald-500" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                All caught up!
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                No clips pending review
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pendingClips?.map((clip) => (
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
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="line-clamp-1 font-semibold text-foreground">
                      {clip.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {clip.description ?? "No description"}
                    </p>

                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="size-3" />
                        {clip.user?.name ?? "Unknown"}
                      </div>
                      {clip.tiktokAccount && (
                        <div className="flex items-center gap-1">
                          <Video className="size-3" />
                          @{clip.tiktokAccount.tiktokUsername}
                        </div>
                      )}
                    </div>

                    {clip.scheduledAt && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                        <Calendar className="size-3" />
                        Scheduled: {new Date(clip.scheduledAt).toLocaleString()}
                      </div>
                    )}

                    <div className="mt-4 flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => openModal(clip)}
                      >
                        <Check className="mr-1 size-3" />
                        Review & Approve
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Review Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Review & Approve
              </h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Title
                </label>
                <input
                  type="text"
                  value={modal.title}
                  onChange={(e) => setModal((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Description (TikTok Caption)
                </label>
                <textarea
                  value={modal.description}
                  onChange={(e) => setModal((prev) => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm text-emerald-800">
                  Approving will immediately create a publish task on GeeLark. The video
                  will be published to TikTok via the linked cloud phone.
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={closeModal} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                  className="flex-1"
                >
                  {approveMutation.isPending ? "Approving..." : "Approve & Publish"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
