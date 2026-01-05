"use client";

import { useState, useRef } from "react";

import {
  Calendar,
  Check,
  Clock,
  Upload,
  Video,
  X,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@everylab/ui/button";

import { useTRPC } from "~/trpc/react";
import { Sidebar } from "~/components/sidebar";
import { creatorNavItems } from "~/config/navigation";

interface User {
  id: string;
  name: string;
  email: string;
}

interface DashboardContentProps {
  user: User;
}

const statusConfig = {
  draft: { color: "bg-gray-100 text-gray-600", label: "Draft" },
  submitted: { color: "bg-amber-50 text-amber-600", label: "Pending Review" },
  approved: { color: "bg-blue-50 text-blue-600", label: "Approved" },
  rejected: { color: "bg-red-50 text-red-600", label: "Rejected" },
  publishing: { color: "bg-purple-50 text-purple-600", label: "Publishing" },
  published: { color: "bg-emerald-50 text-emerald-600", label: "Published" },
  failed: { color: "bg-red-50 text-red-700", label: "Failed" },
};

// Upload Tab Content
function UploadTab() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [caption, setCaption] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Query for clips list
  const { data: clips = [], isLoading } = useQuery(trpc.clip.list.queryOptions());

  // Mutations
  const getPresignedUrl = useMutation(trpc.clip.getPresignedUploadUrl.mutationOptions());
  const createClip = useMutation(trpc.clip.create.mutationOptions());

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      console.log(`[Upload] Selected file: ${file.name}, size: ${file.size}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !caption) {
      console.log("[Upload] Missing required fields");
      return;
    }

    try {
      setUploadState("uploading");
      setUploadProgress(10);

      // Step 1: Get presigned URL
      console.log("[Upload] Getting presigned URL...");
      const presignedResult = await getPresignedUrl.mutateAsync({
        filename: selectedFile.name,
      });
      setUploadProgress(30);
      console.log(`[Upload] Got presigned URL, key: ${presignedResult.key}`);

      // Step 2: Upload to S3
      console.log("[Upload] Uploading to S3...");
      const uploadResponse = await fetch(presignedResult.uploadUrl, {
        method: "PUT",
        body: selectedFile,
        headers: {
          "Content-Type": selectedFile.type || "video/mp4",
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status}`);
      }
      setUploadProgress(70);
      console.log("[Upload] S3 upload complete");

      // Step 3: Create clip record
      console.log("[Upload] Creating clip record...");
      const scheduledAt =
        scheduledDate && scheduledTime
          ? new Date(`${scheduledDate}T${scheduledTime}`)
          : undefined;

      await createClip.mutateAsync({
        title: caption,
        description: caption,
        videoUrl: presignedResult.publicUrl,
        scheduledAt,
      });
      setUploadProgress(100);
      console.log("[Upload] Clip created successfully");

      setUploadState("success");
      
      // Reset form
      setCaption("");
      setScheduledDate("");
      setScheduledTime("");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Refetch clips
      void queryClient.invalidateQueries({ queryKey: trpc.clip.list.queryKey() });

      // Reset state after showing success
      setTimeout(() => {
        setUploadState("idle");
        setUploadProgress(0);
      }, 2000);
    } catch (error) {
      console.error("[Upload] Error:", error);
      setUploadState("error");
      setTimeout(() => setUploadState("idle"), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Form */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Upload New Clip</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Video File
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative cursor-pointer rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 text-center transition-colors hover:border-primary hover:bg-muted/50"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="mx-auto size-12 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                {selectedFile ? selectedFile.name : "Click to upload or drag and drop"}
              </p>
              <p className="text-xs text-muted-foreground">MP4, MOV, WebM up to 500MB</p>
            </div>
          </div>

          {/* Caption */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Caption
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a compelling caption for your clip..."
              className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              rows={3}
            />
          </div>

          {/* Scheduled Time */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Scheduled Date
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Scheduled Time
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!selectedFile || !caption || uploadState === "uploading"}
            className="w-full gap-2"
          >
            {uploadState === "uploading" ? (
              <>
                <Clock className="size-4 animate-spin" />
                Uploading... {uploadProgress}%
              </>
            ) : uploadState === "success" ? (
              <>
                <Check className="size-4" />
                Submitted for Review!
              </>
            ) : uploadState === "error" ? (
              <>
                <X className="size-4" />
                Upload Failed
              </>
            ) : (
              <>
                <Upload className="size-4" />
                Submit for Review
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Clips Status Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border p-4">
          <h2 className="font-semibold text-foreground">Your Clips</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Scheduled
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : clips.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    No clips uploaded yet. Upload your first clip above!
                  </td>
                </tr>
              ) : (
                clips.map((clip) => (
                  <tr key={clip.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{clip.title}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          statusConfig[clip.status].color
                        }`}
                      >
                        {statusConfig[clip.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {clip.scheduledAt ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {new Date(clip.scheduledAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(clip.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


export function DashboardContent({ user }: DashboardContentProps) {
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
        {/* <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center px-8">
            <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
          </div>
        </header> */}

        <div className="p-8">
          <UploadTab />
        </div>
      </main>
    </div>
  );
}
