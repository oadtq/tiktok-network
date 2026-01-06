"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw, Save, Send, Video, XCircle } from "lucide-react";

import type { RouterOutputs } from "@everylab/api";
import { Button } from "@everylab/ui/button";

import { Sidebar } from "~/components/sidebar";
import { creatorNavItems } from "~/config/navigation";
import { useTRPC } from "~/trpc/react";

function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())]
    .join("-")
    .concat("T")
    .concat(pad(date.getHours()))
    .concat(":")
    .concat(pad(date.getMinutes()));
}

export function ClipEditContent(props: {
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

  const { data: tiktokAccounts = [] } = useQuery({
    ...trpc.upload.myTiktokAccounts.queryOptions(),
    enabled: true,
  });

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
    if (clipQuery.fetchStatus === "fetching") return "Edit clip";
    if (!clip) return "Clip not found";
    return `Edit: ${clip.title}`;
  }, [clip, clipQuery.fetchStatus]);

  const canEdit = clip?.status === "draft";

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
                href={`/dashboard/clips/${props.clipId}`}
                className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg p-2"
                title="Back"
              >
                <ArrowLeft className="size-5" />
              </Link>
              <div>
                <h1 className="text-foreground text-xl font-semibold">
                  {title}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {canEdit
                    ? "Update metadata, then save as Draft or submit for review"
                    : "Only draft clips are editable"}
                </p>
              </div>
            </div>

            {clip?.status === "pending" && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => withdrawMutation.mutate({ id: clip.id })}
                disabled={withdrawMutation.isPending}
              >
                <XCircle className="size-4" />
                Withdraw
              </Button>
            )}
          </div>
        </header>

        <div className="p-8">
          {clipQuery.fetchStatus === "fetching" ? (
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
            <ClipEditPanel
              key={clip.id}
              clip={clip}
              tiktokAccounts={tiktokAccounts}
            />
          )}
        </div>
      </main>
    </div>
  );
}

type ClipById = NonNullable<RouterOutputs["clip"]["byId"]>;
type MyTikTokAccount = RouterOutputs["upload"]["myTiktokAccounts"][number];

function ClipEditPanel(props: {
  clip: ClipById;
  tiktokAccounts: MyTikTokAccount[];
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();

  const { clip, tiktokAccounts } = props;
  const canEdit = clip.status === "draft";

  const [form, setForm] = useState(() => ({
    title: clip.title,
    description: clip.description ?? "",
    tiktokAccountId: clip.tiktokAccountId ?? "",
    scheduledAt: clip.scheduledAt
      ? toDatetimeLocalValue(new Date(clip.scheduledAt))
      : "",
  }));

  const updateMutation = useMutation(
    trpc.clip.update.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.clip.byId.queryKey({ id: clip.id }),
        });
        void queryClient.invalidateQueries({
          queryKey: trpc.clip.list.queryKey(),
        });
      },
    }),
  );

  const submitMutation = useMutation(
    trpc.clip.submit.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.clip.list.queryKey(),
        });
        router.push("/dashboard");
      },
    }),
  );

  const saveDraft = useCallback(async () => {
    const nextTitle = form.title.trim();
    if (!nextTitle) {
      alert("Title is required.");
      return;
    }
    await updateMutation.mutateAsync({
      id: clip.id,
      data: {
        title: nextTitle,
        description: form.description.trim() || undefined,
      },
    });
    router.push(`/dashboard/clips/${clip.id}`);
  }, [clip.id, form.description, form.title, router, updateMutation]);

  const submitForReview = useCallback(async () => {
    const nextTitle = form.title.trim();
    if (!nextTitle) {
      alert("Title is required.");
      return;
    }
    const nextCaption = form.description.trim();
    if (!nextCaption) {
      alert("Caption is required for submission.");
      return;
    }
    if (!form.tiktokAccountId) {
      alert("Select a TikTok account.");
      return;
    }
    if (!form.scheduledAt) {
      alert("Select a publish date/time.");
      return;
    }

    await updateMutation.mutateAsync({
      id: clip.id,
      data: {
        title: nextTitle,
        description: nextCaption,
        tiktokAccountId: form.tiktokAccountId,
        scheduledAt: new Date(form.scheduledAt),
      },
    });
    await submitMutation.mutateAsync({ id: clip.id });
  }, [
    clip.id,
    form.description,
    form.scheduledAt,
    form.tiktokAccountId,
    form.title,
    submitMutation,
    updateMutation,
  ]);

  return (
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

      <div className="lg:col-span-2">
        <div className="border-border bg-card rounded-xl border p-6">
          <div className="space-y-4">
            <div>
              <label className="text-foreground mb-2 block text-sm font-medium">
                Title *
              </label>
              <input
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                disabled={!canEdit}
                className="border-border bg-background focus:border-primary w-full rounded-lg border p-2.5 outline-none disabled:opacity-60"
              />
              <p className="text-muted-foreground mt-2 text-xs">
                Internal label. Used for your library + GeeLark task plan name
                (not the TikTok caption).
              </p>
            </div>

            <div>
              <label className="text-foreground mb-2 block text-sm font-medium">
                Caption (TikTok) *
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    description: e.target.value,
                  }))
                }
                rows={6}
                disabled={!canEdit}
                className="border-border bg-background focus:border-primary w-full rounded-lg border p-2.5 outline-none disabled:opacity-60"
              />
              <p className="text-muted-foreground mt-2 text-xs">
                This becomes GeeLark{" "}
                <span className="font-medium">videoDesc</span> for the “Post
                video” task.
              </p>
            </div>

            <div className="border-border rounded-lg border p-4">
              <p className="text-foreground text-sm font-medium">
                Submission settings
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Required only if you click “Submit for review”.
              </p>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-foreground mb-2 block text-sm font-medium">
                    TikTok Account
                  </label>
                  <select
                    value={form.tiktokAccountId}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        tiktokAccountId: e.target.value,
                      }))
                    }
                    disabled={!canEdit}
                    className="border-border bg-background focus:border-primary w-full rounded-lg border p-2.5 outline-none disabled:opacity-60"
                  >
                    <option value="">Select an account</option>
                    {tiktokAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        @{a.tiktokUsername} ({a.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-foreground mb-2 block text-sm font-medium">
                    Publish date/time
                  </label>
                  <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    min={toDatetimeLocalValue(
                      new Date(new Date().getTime() + 60_000),
                    )}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        scheduledAt: e.target.value,
                      }))
                    }
                    disabled={!canEdit}
                    className="border-border bg-background focus:border-primary w-full rounded-lg border p-2.5 outline-none disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => router.push(`/dashboard/clips/${clip.id}`)}
              >
                Back
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => void saveDraft()}
                disabled={!canEdit || updateMutation.isPending}
              >
                <Save className="size-4" />
                {updateMutation.isPending ? "Saving..." : "Save Draft"}
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={() => void submitForReview()}
                disabled={
                  !canEdit ||
                  updateMutation.isPending ||
                  submitMutation.isPending
                }
              >
                <Send className="size-4" />
                {submitMutation.isPending ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
