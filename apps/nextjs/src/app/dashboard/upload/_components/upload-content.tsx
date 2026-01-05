"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  FileVideo,
  FolderOpen,
  Video,
  X,
} from "lucide-react";

import { Button } from "@everylab/ui/button";

import { useTRPC } from "~/trpc/react";
import { Sidebar } from "~/components/sidebar";
import { creatorNavItems } from "~/config/navigation";

interface User {
  id: string;
  name: string;
  email: string;
}

interface UploadContentProps {
  user: User;
}

type UploadStep = "upload" | "details" | "review";

interface UploadState {
  file: File | null;
  videoUrl: string | null;
  title: string;
  description: string;
  tiktokAccountId: string;
  scheduledAt: string;
}

export function UploadContent({ user }: UploadContentProps) {
  const router = useRouter();
  const [step, setStep] = useState<UploadStep>("upload");
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

  const { data: tiktokAccounts } = useQuery(
    trpc.upload.myTiktokAccounts.queryOptions()
  );

  // Fetch user's clips for library selection
  const { data: userClips } = useQuery(
    trpc.clip.list.queryOptions(undefined)
  );

  const presignedUrlMutation = useMutation(
    trpc.upload.getPresignedUrl.mutationOptions()
  );

  const createClipMutation = useMutation(
    trpc.clip.create.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.clip.list.queryKey() });
      },
    })
  );

  const submitClipMutation = useMutation(
    trpc.clip.submit.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.clip.list.queryKey() });
        router.push("/dashboard");
      },
    })
  );

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 500MB)
      if (file.size > 500 * 1024 * 1024) {
        alert("File size must be under 500MB");
        return;
      }

      // Validate file type
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) {
        alert("Invalid file type. Allowed: mp4, webm, mov, avi, mkv");
        return;
      }

      setUploadState((prev) => ({
        ...prev,
        file,
        title: file.name.replace(/\.[^/.]+$/, ""), // Use filename as initial title
      }));
    }
  }, []);

  const handleUpload = async () => {
    if (!uploadState.file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Get presigned URL
      const { uploadUrl, publicUrl } = await presignedUrlMutation.mutateAsync({
        filename: uploadState.file.name,
        fileSize: uploadState.file.size,
      });

      // Upload file to S3
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.open("PUT", uploadUrl);
        if (uploadState.file) {
          xhr.setRequestHeader("Content-Type", uploadState.file.type || "video/mp4");
          xhr.send(uploadState.file);
        } else {
          reject(new Error("No file selected"));
        }
      });

      setUploadState((prev) => ({ ...prev, videoUrl: publicUrl }));
      setStep("details");
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
      // Create clip
      const clip = await createClipMutation.mutateAsync({
        title: uploadState.title,
        description: uploadState.description || undefined,
        videoUrl: uploadState.videoUrl,
        scheduledAt: uploadState.scheduledAt ? new Date(uploadState.scheduledAt) : undefined,
      });

      // Submit for review
      if (clip) {
        await submitClipMutation.mutateAsync({ id: clip.id });
      }
    } catch (error) {
      console.error("Submit error:", error);
      alert("Failed to submit. Please try again.");
    }
  };

  const stepIndicators = [
    { id: "upload", label: "Upload" },
    { id: "details", label: "Details" },
    { id: "review", label: "Review" },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        user={user}
        title="Creator"
        logoIcon={Video}
        items={creatorNavItems}
        bottomContent={
          <>
            <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Support
            </p>
          </>
        }
      />

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
                  Upload Video
                </h1>
                <p className="text-sm text-muted-foreground">
                  Upload a video for TikTok publishing
                </p>
              </div>
            </div>

            {/* Step indicators */}
            <div className="flex items-center gap-2">
              {stepIndicators.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2">
                  <div
                    className={`flex size-8 items-center justify-center rounded-full text-xs font-medium ${
                      step === s.id
                        ? "bg-primary text-primary-foreground"
                        : stepIndicators.findIndex((x) => x.id === step) > i
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {stepIndicators.findIndex((x) => x.id === step) > i ? (
                      <Check className="size-4" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={`text-sm ${
                      step === s.id ? "font-medium text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </span>
                  {i < stepIndicators.length - 1 && (
                    <div className="mx-2 h-px w-8 bg-border" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </header>

        <div className="p-8">
          <div className="mx-auto max-w-2xl">
            {/* Upload Step */}
            {step === "upload" && (
              <div className="rounded-xl border border-border bg-card p-8">
                <h2 className="mb-6 text-lg font-semibold text-foreground">
                  Select Video
                </h2>

                {/* Toggle between upload and library */}
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

                {/* Library Selection */}
                {showLibrary ? (
                  <div className="space-y-4">
                    {!userClips || userClips.length === 0 ? (
                      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-8">
                        <Video className="mb-2 size-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          No previously uploaded videos
                        </p>
                      </div>
                    ) : uploadState.selectedFromLibrary && uploadState.selectedClipId ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-4 rounded-lg border border-primary bg-primary/5 p-4">
                          <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
                            <Video className="size-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-foreground">
                              {uploadState.title}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Selected from library
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              setUploadState((prev) => ({
                                ...prev,
                                selectedFromLibrary: false,
                                selectedClipId: null,
                                videoUrl: null,
                                title: "",
                                description: "",
                              }))
                            }
                            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                        <Button
                          onClick={() => setStep("details")}
                          className="w-full"
                        >
                          Continue to Details
                        </Button>
                      </div>
                    ) : (
                      <div className="max-h-64 space-y-2 overflow-y-auto">
                        {userClips.map((clip) => (
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
                              }));
                            }}
                            className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
                          >
                            <div className="relative aspect-video w-20 overflow-hidden rounded bg-muted">
                              <video
                                src={clip.videoUrl}
                                className="size-full object-cover"
                                muted
                              />
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <p className="truncate font-medium text-foreground">
                                {clip.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(clip.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Upload New */
                  !uploadState.file ? (
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-12 transition-colors hover:border-primary/50 hover:bg-muted/50">
                      <FileVideo className="mb-4 size-12 text-muted-foreground" />
                      <p className="mb-2 text-sm font-medium text-foreground">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">
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
                      <div className="flex items-center gap-4 rounded-lg border border-border p-4">
                        <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
                          <Video className="size-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">
                            {uploadState.file.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {(uploadState.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            setUploadState((prev) => ({ ...prev, file: null }))
                          }
                          className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          <X className="size-4" />
                        </button>
                      </div>

                      {isUploading && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Uploading...</span>
                            <span className="font-medium text-foreground">{uploadProgress}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-primary transition-all"
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
                  )
                )}
              </div>
            )}

            {/* Details Step */}
            {step === "details" && (
              <div className="rounded-xl border border-border bg-card p-8">
                <h2 className="mb-6 text-lg font-semibold text-foreground">
                  Video Details
                </h2>

                <div className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={uploadState.title}
                      onChange={(e) =>
                        setUploadState((prev) => ({ ...prev, title: e.target.value }))
                      }
                      placeholder="Enter video title"
                      className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Description
                    </label>
                    <textarea
                      value={uploadState.description}
                      onChange={(e) =>
                        setUploadState((prev) => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="Enter video description (TikTok caption)"
                      rows={4}
                      className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      TikTok Account *
                    </label>
                    <select
                      value={uploadState.tiktokAccountId}
                      onChange={(e) =>
                        setUploadState((prev) => ({ ...prev, tiktokAccountId: e.target.value }))
                      }
                      className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Select an account</option>
                      {tiktokAccounts?.map((account) => (
                        <option key={account.id} value={account.id}>
                          @{account.tiktokUsername} ({account.name})
                        </option>
                      ))}
                    </select>
                    {tiktokAccounts?.length === 0 && (
                      <p className="mt-2 text-sm text-amber-600">
                        No TikTok accounts linked. Contact admin to link an account.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Scheduled Publish Time
                    </label>
                    <input
                      type="datetime-local"
                      value={uploadState.scheduledAt}
                      onChange={(e) =>
                        setUploadState((prev) => ({ ...prev, scheduledAt: e.target.value }))
                      }
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Leave empty for ASAP publishing after approval
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setStep("upload")}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={() => setStep("review")}
                      disabled={!uploadState.title || !uploadState.tiktokAccountId}
                      className="flex-1"
                    >
                      Continue
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Review Step */}
            {step === "review" && (
              <div className="rounded-xl border border-border bg-card p-8">
                <h2 className="mb-6 text-lg font-semibold text-foreground">
                  Review & Submit
                </h2>

                <div className="space-y-4">
                  <div className="rounded-lg border border-border p-4">
                    <dl className="space-y-3">
                      <div className="flex justify-between">
                        <dt className="text-sm text-muted-foreground">Title</dt>
                        <dd className="text-sm font-medium text-foreground">
                          {uploadState.title}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-muted-foreground">Description</dt>
                        <dd className="text-sm font-medium text-foreground">
                          {uploadState.description || "No description"}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-muted-foreground">TikTok Account</dt>
                        <dd className="text-sm font-medium text-foreground">
                          @{tiktokAccounts?.find((a) => a.id === uploadState.tiktokAccountId)?.tiktokUsername}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-muted-foreground">Scheduled</dt>
                        <dd className="text-sm font-medium text-foreground">
                          {uploadState.scheduledAt
                            ? new Date(uploadState.scheduledAt).toLocaleString()
                            : "ASAP after approval"}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm text-amber-800">
                      Your video will be reviewed by an admin before publishing. You'll be
                      notified when it's approved.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setStep("details")}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={createClipMutation.isPending || submitClipMutation.isPending}
                      className="flex-1"
                    >
                      {createClipMutation.isPending || submitClipMutation.isPending
                        ? "Submitting..."
                        : "Submit for Review"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
