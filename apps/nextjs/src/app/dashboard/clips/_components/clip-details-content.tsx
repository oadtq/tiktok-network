"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Edit, RefreshCw, Send, Video, X } from "lucide-react";

import { Button } from "@everylab/ui/button";

import { Sidebar } from "~/components/sidebar";
import { creatorNavItems } from "~/config/navigation";
import { useTRPC } from "~/trpc/react";

const statusLabels: Record<string, string> = {
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

export function ClipDetailsContent(props: {
  user: { id: string; name: string; email: string };
  clipId: string;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const clipQuery = useQuery({
    ...trpc.clip.byId.queryOptions({ id: props.clipId }),
    enabled: Boolean(props.clipId),
  });
  const clip = clipQuery.data ?? null;

  const withdrawMutation = useMutation(
    trpc.clip.withdraw.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.clip.byId.queryKey({ id: props.clipId }),
        });
        void queryClient.invalidateQueries({
          queryKey: trpc.clip.list.queryKey(),
        });
      },
    }),
  );

  const title = useMemo(() => {
    if (clipQuery.isLoading) return "Clip";
    if (!clip) return "Clip not found";
    return clip.title;
  }, [clip, clipQuery.isLoading]);

  return (
    <div className="bg-background flex min-h-screen">
      <Sidebar
        user={props.user}
        title="Creator"
        logoIcon={Video}
        items={creatorNavItems}
      />

      <main className="flex-1 overflow-auto">
        <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 border-b backdrop-blur">
          <div className="flex h-16 items-center justify-between px-8">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg p-2"
                title="Back to My Clips"
              >
                <ArrowLeft className="size-5" />
              </Link>
              <div>
                <h1 className="text-foreground text-xl font-semibold">
                  {title}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {clip ? "Clip details" : "This clip doesn’t exist or you don’t have access"}
                </p>
              </div>
            </div>

            {clip && (
              <div className="flex items-center gap-2">
                {clip.status === "draft" && (
                  <>
                    <Button asChild variant="outline" className="gap-2">
                      <Link href={`/dashboard/clips/${clip.id}/edit`}>
                        <Edit className="size-4" />
                        Edit
                      </Link>
                    </Button>
                    <Button asChild className="gap-2">
                      <Link href={`/dashboard/clips/${clip.id}/edit`}>
                        <Send className="size-4" />
                        Submit
                      </Link>
                    </Button>
                  </>
                )}

                {clip.status === "pending" && (
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => withdrawMutation.mutate({ id: clip.id })}
                    disabled={withdrawMutation.isPending}
                  >
                    <X className="size-4" />
                    Withdraw
                  </Button>
                )}
              </div>
            )}
          </div>
        </header>

        <div className="p-8">
          {clipQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="text-muted-foreground size-8 animate-spin" />
            </div>
          ) : !clip ? (
            <div className="border-border bg-card rounded-xl border p-8">
              <p className="text-foreground font-medium">Clip not found</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Either it doesn’t exist, or it’s not owned by your user.
              </p>
              <div className="mt-6">
                <Button asChild>
                  <Link href="/dashboard">Back to My Clips</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-5">
              <div className="border-border bg-card overflow-hidden rounded-xl border lg:col-span-3">
                <div className="bg-muted aspect-video">
                  <video
                    src={clip.videoUrl}
                    className="size-full object-cover"
                    controls
                    playsInline
                  />
                </div>
              </div>

              <div className="space-y-4 lg:col-span-2">
                <div className="border-border bg-card rounded-xl border p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-foreground truncate text-lg font-semibold">
                        {clip.title}
                      </h2>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {clip.description ?? "No caption"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                        statusColors[clip.status] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {statusLabels[clip.status] ?? clip.status}
                    </span>
                  </div>

                  <dl className="mt-6 space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Created</dt>
                      <dd className="text-foreground font-medium">
                        {new Date(clip.createdAt).toLocaleString()}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Scheduled</dt>
                      <dd className="text-foreground font-medium">
                        {clip.scheduledAt
                          ? new Date(clip.scheduledAt).toLocaleString()
                          : "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">TikTok account</dt>
                      <dd className="text-foreground font-medium">
                        {clip.tiktokAccount ? `@${clip.tiktokAccount.tiktokUsername}` : "—"}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

