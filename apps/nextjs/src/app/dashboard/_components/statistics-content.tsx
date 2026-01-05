"use client";

import {
  Eye,
  Heart,
  MessageCircle,
  RefreshCw,
  Share2,
  Video,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@everylab/ui/button";

import { useTRPC } from "~/trpc/react";
import { Sidebar } from "~/components/sidebar";
import { creatorNavItems } from "~/config/navigation";

interface User {
  id: string;
  name: string;
  email: string;
}

interface StatisticsContentProps {
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

// Stat Card Component
function StatCard({
  title,
  value,
  icon: Icon,
  accentColor = "#3b82f6",
  isLoading = false,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  accentColor?: string;
  isLoading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {isLoading ? (
              <span className="inline-block h-8 w-20 animate-pulse rounded bg-muted" />
            ) : typeof value === "number" ? (
              value.toLocaleString()
            ) : (
              value
            )}
          </p>
        </div>
        <div
          className="flex size-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${accentColor}10` }}
        >
          <Icon className="size-5" style={{ color: accentColor }} />
        </div>
      </div>
    </div>
  );
}

export function StatisticsContent({ user }: StatisticsContentProps) {
  const trpc = useTRPC();

  // Query for user's clips with stats
  const { data, isLoading, refetch, isRefetching } = useQuery(
    trpc.tiktokStats.getUserClipsStats.queryOptions()
  );

  const totals = data?.totals ?? { views: 0, likes: 0, comments: 0, shares: 0 };
  const clips = data?.clips ?? [];

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
        <div className="space-y-6 p-8">
          {/* Header with Refresh */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Statistics</h1>
              <p className="text-sm text-muted-foreground">
                Track the performance of your published clips
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isRefetching}
              className="gap-2"
            >
              <RefreshCw className={`size-4 ${isRefetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Summary Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Views"
              value={totals.views}
              icon={Eye}
              accentColor="#3b82f6"
              isLoading={isLoading}
            />
            <StatCard
              title="Total Likes"
              value={totals.likes}
              icon={Heart}
              accentColor="#ec4899"
              isLoading={isLoading}
            />
            <StatCard
              title="Total Comments"
              value={totals.comments}
              icon={MessageCircle}
              accentColor="#10b981"
              isLoading={isLoading}
            />
            <StatCard
              title="Total Shares"
              value={totals.shares}
              icon={Share2}
              accentColor="#f59e0b"
              isLoading={isLoading}
            />
          </div>

          {/* Per-Clip Stats Table */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border p-4">
              <h2 className="font-semibold text-foreground">Clip Performance</h2>
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
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <div className="flex items-center justify-end gap-1">
                        <Eye className="size-3" />
                        Views
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <div className="flex items-center justify-end gap-1">
                        <Heart className="size-3" />
                        Likes
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <div className="flex items-center justify-end gap-1">
                        <MessageCircle className="size-3" />
                        Comments
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <div className="flex items-center justify-end gap-1">
                        <Share2 className="size-3" />
                        Shares
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        Loading statistics...
                      </td>
                    </tr>
                  ) : clips.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        No clips found. Upload your first clip to see statistics here.
                      </td>
                    </tr>
                  ) : (
                    clips.map((clip) => (
                      <tr key={clip.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{clip.title}</p>
                          {clip.tiktokAccount && (
                            <p className="text-xs text-muted-foreground">
                              @{clip.tiktokAccount.tiktokUsername}
                            </p>
                          )}
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
                        <td className="px-4 py-3 text-right tabular-nums text-foreground">
                          {clip.stats?.views.toLocaleString() ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-foreground">
                          {clip.stats?.likes.toLocaleString() ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-foreground">
                          {clip.stats?.comments.toLocaleString() ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-foreground">
                          {clip.stats?.shares.toLocaleString() ?? "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Info Note */}
          {clips.length > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              <p>
                <strong>Note:</strong> Statistics are synced from TikTok periodically. 
                If you recently published a clip, stats may take a few minutes to appear.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
