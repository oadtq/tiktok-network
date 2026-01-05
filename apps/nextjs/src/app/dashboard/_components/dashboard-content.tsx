"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Edit,
  Eye,
  FileVideo,
  FolderOpen,
  Play,
  RefreshCw,
  Send,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";

import { Button } from "@everylab/ui/button";

import { Sidebar } from "~/components/sidebar";
import { creatorNavItems } from "~/config/navigation";
import { useTRPC } from "~/trpc/react";
import { AssignedTikTokAccount } from "./assigned-tiktok-account";

interface User {
  id: string;
  name: string;
  email: string;
}

interface DashboardContentProps {
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

function toDatetimeLocalValue(date: Date): string {
  // "YYYY-MM-DDTHH:mm" in local time (for <input type="datetime-local" />)
  const pad = (n: number) => String(n).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-")
    .concat("T")
    .concat(pad(date.getHours()))
    .concat(":")
    .concat(pad(date.getMinutes()));
}

type ViewMode = "list" | "upload";
type UploadStep = "upload" | "details" | "review";

interface UploadState {
  file: File | null;
  videoUrl: string | null;
  title: string;
  description: string;
  tiktokAccountId: string;
  scheduledAt: string;
  selectedFromLibrary: boolean;
  selectedClipId: string | null;
}

export function DashboardContent({ user }: DashboardContentProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    clipId: string | null;
    title: string;
  }>({
    isOpen: false,
    clipId: null,
    title: "",
  });

  // Upload State
  const [uploadStep, setUploadStep] = useState<UploadStep>("upload");
  const [uploadState, setUploadState] = useState<UploadState>({
    file: null,
    videoUrl: null,
    title: "",
    description: "",
    tiktokAccountId: "",
    scheduledAt: "",
    selectedFromLibrary: false,
    selectedClipId: null,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showLibrary, setShowLibrary] = useState(false);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Queries
  const {
    data: clips,
    isLoading: isLoadingClips,
    refetch,
  } = useQuery(
    trpc.clip.list.queryOptions(
      statusFilter === "all" ? undefined : { status: statusFilter },
    ),
  );

  const { data: draftClips = [], isLoading: isLoadingDraftClips } = useQuery({
    ...trpc.clip.list.queryOptions({ status: "draft" }),
    enabled: viewMode === "upload" && showLibrary,
  });

  const { data: tiktokAccounts = [] } = useQuery({
    ...trpc.upload.myTiktokAccounts.queryOptions(),
    enabled: viewMode === "upload",
  });

  // Mutations
  const deleteMutation = useMutation(
    trpc.clip.delete.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.clip.list.queryKey(),
        });
        setDeleteModal({ isOpen: false, clipId: null, title: "" });
      },
    }),
  );

  const withdrawMutation = useMutation(
    trpc.clip.withdraw.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.clip.list.queryKey(),
        });
      },
    }),
  );

  const presignedUrlMutation = useMutation(
    trpc.upload.getPresignedUrl.mutationOptions(),
  );

  const createClipMutation = useMutation(
    trpc.clip.create.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.clip.list.queryKey(),
        });
      },
    }),
  );

  const updateClipMutation = useMutation(
    trpc.clip.update.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.clip.list.queryKey(),
        });
      },
    }),
  );

  const resetUploadFlow = useCallback(() => {
    setUploadStep("upload");
    setShowLibrary(false);
    setUploadProgress(0);
    setIsUploading(false);
    setUploadState({
      file: null,
      videoUrl: null,
      title: "",
      description: "",
      tiktokAccountId: "",
      scheduledAt: "",
      selectedFromLibrary: false,
      selectedClipId: null,
    });
  }, []);

  const exitUploadToLibrary = useCallback(() => {
    setViewMode("list");
    resetUploadFlow();
  }, [resetUploadFlow]);

  const submitClipMutation = useMutation(
    trpc.clip.submit.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.clip.list.queryKey(),
        });
        setViewMode("list");
        resetUploadFlow();
      },
    }),
  );

  const handleDelete = () => {
    if (deleteModal.clipId) {
      deleteMutation.mutate({ id: deleteModal.clipId });
    }
  };

  const handleWithdraw = (clipId: string) => {
    withdrawMutation.mutate({ id: clipId });
  };

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (file.size > 500 * 1024 * 1024) {
          alert("File size must be under 500MB");
          return;
        }
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (!ext || !["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) {
          alert("Invalid file type. Allowed: mp4, webm, mov, avi, mkv");
          return;
        }
        setUploadState((prev) => ({
          ...prev,
          file,
          title: file.name.replace(/\.[^/.]+$/, ""),
        }));
      }
    },
    [],
  );

  const handleUpload = async () => {
    if (!uploadState.file) return;
    setIsUploading(true);
    setUploadProgress(0);
    try {
      const { uploadUrl, publicUrl } = await presignedUrlMutation.mutateAsync({
        filename: uploadState.file.name,
        fileSize: uploadState.file.size,
      });
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader(
          "Content-Type",
          uploadState.file?.type ?? "video/mp4",
        );
        xhr.send(uploadState.file);
      });
      const title = uploadState.title.trim();
      if (!title) {
        alert("Please provide a title for this video.");
        return;
      }

      // Persist immediately as a draft clip (library upload). Submission is an explicit follow-up.
      const created = await createClipMutation.mutateAsync({
        title,
        description: uploadState.description.trim() || undefined,
        videoUrl: publicUrl,
      });

      setUploadState((prev) => ({
        ...prev,
        videoUrl: publicUrl,
        selectedFromLibrary: true,
        selectedClipId: created?.id ?? null,
      }));
      setUploadStep("details");
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!uploadState.videoUrl) return;
    try {
      const title = uploadState.title.trim();
      if (!title) {
        alert("Please provide a title.");
        return;
      }
      const caption = uploadState.description.trim();
      if (!caption) {
        alert("Caption is required for submission.");
        return;
      }

      if (!uploadState.tiktokAccountId) {
        alert("Please select a TikTok account.");
        return;
      }
      if (!uploadState.scheduledAt) {
        alert("Please select a publish date/time.");
        return;
      }

      let effectiveClipId = uploadState.selectedClipId;
      if (!effectiveClipId) {
        // Shouldn't happen (we create the draft on upload / pick from library), but keep a safe fallback.
        const created = await createClipMutation.mutateAsync({
          title,
          description: uploadState.description.trim() || undefined,
          videoUrl: uploadState.videoUrl,
        });
        if (!created?.id) throw new Error("Failed to create clip");
        effectiveClipId = created.id;
        setUploadState((prev) => ({ ...prev, selectedClipId: created.id }));
      }

      if (!effectiveClipId) throw new Error("Missing clip id");

      await updateClipMutation.mutateAsync({
        id: effectiveClipId,
        data: {
          title,
          description: caption,
          tiktokAccountId: uploadState.tiktokAccountId,
          scheduledAt: uploadState.scheduledAt
            ? new Date(uploadState.scheduledAt)
            : undefined,
        },
      });

      await submitClipMutation.mutateAsync({ id: effectiveClipId });
    } catch (error) {
      console.error("Submit error:", error);
      alert("Failed to submit. Please try again.");
    }
  };

  const handleSaveToLibrary = async () => {
    try {
      const clipId = uploadState.selectedClipId;
      if (!clipId) {
        alert("Nothing to save yet.");
        return;
      }
      const title = uploadState.title.trim();
      if (!title) {
        alert("Please provide a title.");
        return;
      }

      await updateClipMutation.mutateAsync({
        id: clipId,
        data: {
          title,
          description: uploadState.description.trim() || undefined,
        },
      });

      exitUploadToLibrary();
    } catch (error) {
      console.error("Save draft error:", error);
      alert("Failed to save. Please try again.");
    }
  };

  return (
    <div className="bg-background flex min-h-screen">
      <Sidebar
        user={user}
        title="Creator"
        logoIcon={Video}
        items={creatorNavItems}
        bottomContent={
          <>
            <p className="text-muted-foreground mb-2 px-3 text-xs font-medium tracking-wider uppercase">
              Support
            </p>
          </>
        }
      />

      <main className="flex-1 overflow-auto">
        <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 border-b backdrop-blur">
          <div className="flex h-16 items-center justify-between px-8">
            <div className="flex items-center gap-4">
              {viewMode === "upload" && (
                <button
                  onClick={exitUploadToLibrary}
                  className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg p-2"
                >
                  <ArrowLeft className="size-5" />
                </button>
              )}
              <div>
                <h1 className="text-foreground text-xl font-semibold">
                  {viewMode === "list" ? "My Clips" : "Upload Video"}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {viewMode === "list"
                    ? "Manage all your uploaded videos"
                    : "Upload to your library first, then submit when ready"}
                </p>
              </div>
            </div>
            {viewMode === "list" && (
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => void refetch()}
                  disabled={isLoadingClips}
                >
                  <RefreshCw
                    className={`size-4 ${isLoadingClips ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
                <Button
                  onClick={() => {
                    resetUploadFlow();
                    setViewMode("upload");
                  }}
                  className="gap-2"
                >
                  <Upload className="size-4" />
                  Upload New
                </Button>
              </div>
            )}
          </div>
        </header>

        <div className="p-8">
          {viewMode === "list" ? (
            <>
              <AssignedTikTokAccount />
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
                  </button>
                ))}
              </div>

              {isLoadingClips ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="text-muted-foreground size-8 animate-spin" />
                </div>
              ) : clips?.length === 0 ? (
                <div className="border-border bg-card flex flex-col items-center justify-center rounded-xl border py-16">
                  <Video className="text-muted-foreground size-12" />
                  <h3 className="text-foreground mt-4 text-lg font-semibold">
                    No clips found
                  </h3>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {statusFilter === "all"
                      ? "Upload your first video to get started"
                      : `No clips with status "${statusLabels[statusFilter]}"`}
                  </p>
                  {statusFilter === "all" && (
                    <Button
                      onClick={() => {
                        resetUploadFlow();
                        setViewMode("upload");
                      }}
                      className="mt-4 gap-2"
                    >
                      <Upload className="size-4" />
                      Upload Video
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {clips?.map((clip) => (
                    <div
                      key={clip.id}
                      className="border-border bg-card overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md"
                    >
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
                      <div className="p-4">
                        <h3 className="text-foreground line-clamp-1 font-semibold">
                          {clip.title}
                        </h3>
                        <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                          {clip.description ?? "No description"}
                        </p>
                        {clip.tiktokAccount && (
                          <div className="text-muted-foreground mt-2 flex items-center gap-1 text-xs">
                            <Video className="size-3" />@
                            {clip.tiktokAccount.tiktokUsername}
                          </div>
                        )}
                        {clip.scheduledAt && (
                          <div className="text-muted-foreground mt-1 text-xs">
                            Publish:{" "}
                            {new Date(clip.scheduledAt).toLocaleString([], {
                              month: "short",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        )}
                        <div className="text-muted-foreground mt-2 text-xs">
                          Created:{" "}
                          {new Date(clip.createdAt).toLocaleDateString()}
                        </div>
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
                              className="flex-1 gap-1"
                              onClick={() => {
                                setViewMode("upload");
                                setUploadStep("details");
                                setShowLibrary(false);
                                setUploadState((prev) => ({
                                  ...prev,
                                  file: null,
                                  selectedFromLibrary: true,
                                  selectedClipId: clip.id,
                                  videoUrl: clip.videoUrl,
                                  title: clip.title,
                                  description: clip.description ?? "",
                                  tiktokAccountId: clip.tiktokAccountId ?? "",
                                  scheduledAt: clip.scheduledAt
                                    ? toDatetimeLocalValue(
                                        new Date(clip.scheduledAt),
                                      )
                                    : "",
                                }));
                              }}
                            >
                              <Send className="size-3" />
                              Submit
                            </Button>
                          )}
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
                          {clip.status === "pending" && (
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
            </>
          ) : (
            <div className="mx-auto max-w-2xl">
              <div className="border-border bg-card rounded-xl border p-8">
                {uploadStep === "upload" && (
                  <>
                    <h2 className="text-foreground mb-6 text-lg font-semibold">
                      Select Video
                    </h2>
                    <div className="mb-6 flex gap-2">
                      <button
                        onClick={() => setShowLibrary(false)}
                        className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                          !showLibrary
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        <Upload className="mr-2 inline size-4" />
                        Upload New
                      </button>
                      <button
                        onClick={() => setShowLibrary(true)}
                        className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                          showLibrary
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        <FolderOpen className="mr-2 inline size-4" />
                        Select from Library
                      </button>
                    </div>

                    {showLibrary ? (
                      <div className="space-y-4">
                        {isLoadingDraftClips ? (
                          <div className="flex items-center justify-center py-8">
                            <RefreshCw className="text-muted-foreground size-6 animate-spin" />
                          </div>
                        ) : draftClips.length === 0 ? (
                          <div className="border-border bg-muted/30 flex flex-col items-center justify-center rounded-lg border border-dashed p-8">
                            <Video className="text-muted-foreground mb-2 size-8" />
                            <p className="text-muted-foreground text-sm">
                              No draft clips available
                            </p>
                          </div>
                        ) : (
                          <div className="max-h-64 space-y-2 overflow-y-auto">
                            {draftClips.map((clip) => (
                              <button
                                key={clip.id}
                                onClick={() => {
                                  setUploadState((prev) => ({
                                    ...prev,
                                    selectedFromLibrary: true,
                                    selectedClipId: clip.id,
                                    videoUrl: clip.videoUrl,
                                    title: clip.title,
                                    description: clip.description ?? "",
                                    tiktokAccountId: clip.tiktokAccountId ?? "",
                                    scheduledAt: clip.scheduledAt
                                      ? toDatetimeLocalValue(
                                          new Date(clip.scheduledAt),
                                        )
                                      : "",
                                  }));
                                  setUploadStep("details");
                                }}
                                className="border-border hover:border-primary hover:bg-primary/5 flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors"
                              >
                                <div className="bg-muted relative aspect-video w-20 overflow-hidden rounded">
                                  <video
                                    src={clip.videoUrl}
                                    className="size-full object-cover"
                                    muted
                                  />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                  <p className="text-foreground truncate font-medium">
                                    {clip.title}
                                  </p>
                                  <p className="text-muted-foreground text-xs">
                                    {new Date(
                                      clip.createdAt,
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : !uploadState.file ? (
                      <label className="border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors">
                        <FileVideo className="text-muted-foreground mb-4 size-12" />
                        <p className="text-foreground mb-2 text-sm font-medium">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-muted-foreground text-xs">
                          MP4, WebM, MOV, AVI, or MKV (max 500MB)
                        </p>
                        <input
                          type="file"
                          accept=".mp4,.webm,.mov,.avi,.mkv"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="space-y-4">
                        <div className="border-border flex items-center gap-4 rounded-lg border p-4">
                          <div className="bg-primary/10 flex size-12 items-center justify-center rounded-lg">
                            <Video className="text-primary size-6" />
                          </div>
                          <div className="flex-1">
                            <p className="text-foreground font-medium">
                              {uploadState.file.name}
                            </p>
                            <p className="text-muted-foreground text-sm">
                              {(uploadState.file.size / 1024 / 1024).toFixed(2)}{" "}
                              MB
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              setUploadState((prev) => ({
                                ...prev,
                                file: null,
                              }))
                            }
                            className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg p-2"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                        {isUploading && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Uploading...
                              </span>
                              <span className="text-foreground font-medium">
                                {uploadProgress}%
                              </span>
                            </div>
                            <div className="bg-muted h-2 overflow-hidden rounded-full">
                              <div
                                className="bg-primary h-full transition-all"
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                          </div>
                        )}
                        <Button
                          onClick={handleUpload}
                          disabled={isUploading}
                          className="w-full"
                        >
                          {isUploading ? "Uploading..." : "Upload & Continue"}
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {uploadStep === "details" && (
                  <div className="space-y-6">
                    <h2 className="text-foreground text-lg font-semibold">
                      Video Details
                    </h2>
                    <div>
                      <label className="text-foreground mb-2 block text-sm font-medium">
                        Title *
                      </label>
                      <input
                        type="text"
                        value={uploadState.title}
                        onChange={(e) =>
                          setUploadState((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                        className="border-border bg-background focus:border-primary w-full rounded-lg border p-2.5 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-foreground mb-2 block text-sm font-medium">
                        Caption (TikTok)
                      </label>
                      <textarea
                        value={uploadState.description}
                        onChange={(e) =>
                          setUploadState((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        rows={4}
                        className="border-border bg-background focus:border-primary w-full rounded-lg border p-2.5 outline-none"
                      />
                      <p className="text-muted-foreground mt-2 text-xs">
                        Required for submission. This becomes GeeLark <span className="font-medium">videoDesc</span>.
                      </p>
                    </div>
                    <div>
                      <label className="text-foreground mb-2 block text-sm font-medium">
                        TikTok Account (for submission)
                      </label>
                      <select
                        value={uploadState.tiktokAccountId}
                        onChange={(e) =>
                          setUploadState((prev) => ({
                            ...prev,
                            tiktokAccountId: e.target.value,
                          }))
                        }
                        className="border-border bg-background focus:border-primary w-full rounded-lg border p-2.5 outline-none"
                      >
                        <option value="">Select an account</option>
                        {tiktokAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            @{account.tiktokUsername} ({account.name})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-foreground mb-2 block text-sm font-medium">
                        Publish date/time (for submission)
                      </label>
                      <input
                        type="datetime-local"
                        value={uploadState.scheduledAt}
                        min={toDatetimeLocalValue(new Date(Date.now() + 60_000))}
                        onChange={(e) =>
                          setUploadState((prev) => ({
                            ...prev,
                            scheduledAt: e.target.value,
                          }))
                        }
                        className="border-border bg-background focus:border-primary w-full rounded-lg border p-2.5 outline-none"
                      />
                      <p className="text-muted-foreground mt-2 text-xs">
                        Local time. If approval happens after this time, it’ll
                        post ASAP.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setUploadStep("upload")}
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={handleSaveToLibrary}
                        disabled={updateClipMutation.isPending || !uploadState.selectedClipId}
                        className="flex-1"
                        variant="outline"
                      >
                        {updateClipMutation.isPending ? "Saving..." : "Save to Library"}
                      </Button>
                      <Button
                        onClick={() => setUploadStep("review")}
                        disabled={
                          !uploadState.title.trim() ||
                          !uploadState.description.trim() ||
                          !uploadState.tiktokAccountId ||
                          !uploadState.scheduledAt ||
                          updateClipMutation.isPending
                        }
                        className="flex-1"
                      >
                        Continue
                      </Button>
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Save to Library keeps this clip in <span className="font-medium">Draft</span>. Continue advances to review + submission.
                    </div>
                  </div>
                )}

                {uploadStep === "review" && (
                  <div className="space-y-6">
                    <h2 className="text-foreground text-lg font-semibold">
                      Review & Submit
                    </h2>
                    <div className="border-border rounded-lg border p-4">
                      <dl className="space-y-3">
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground text-sm">
                            Title
                          </dt>
                          <dd className="text-sm font-medium">
                            {uploadState.title}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground text-sm">
                            Account
                          </dt>
                          <dd className="text-sm font-medium">
                            @
                            {
                              tiktokAccounts.find(
                                (a) => a.id === uploadState.tiktokAccountId,
                              )?.tiktokUsername
                            }
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground text-sm">
                            Publish time
                          </dt>
                          <dd className="text-sm font-medium">
                            {uploadState.scheduledAt
                              ? new Date(uploadState.scheduledAt).toLocaleString()
                              : "—"}
                          </dd>
                        </div>
                      </dl>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setUploadStep("details")}
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={
                          createClipMutation.isPending ||
                          submitClipMutation.isPending
                        }
                        className="flex-1"
                      >
                        {createClipMutation.isPending ||
                        submitClipMutation.isPending
                          ? "Submitting..."
                          : "Submit for Review"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card w-full max-w-md rounded-xl p-6 shadow-lg">
            <h2 className="text-foreground text-lg font-semibold">
              Delete Clip
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Are you sure you want to delete "{deleteModal.title}"? This action
              cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                onClick={() =>
                  setDeleteModal({ isOpen: false, clipId: null, title: "" })
                }
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
