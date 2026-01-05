"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Eye,
  Heart,
  MessageCircle,
  RefreshCw,
  Share2,
  Video,
} from "lucide-react";

import { Button } from "@everylab/ui/button";

import { Sidebar } from "~/components/sidebar";
import { creatorNavItems } from "~/config/navigation";
import { useTRPC } from "~/trpc/react";

interface User {
  id: string;
  name: string;
  email: string;
}

interface AnalyticsContentProps {
  user: User;
}

const statusConfig = {
  draft: { color: "bg-gray-100 text-gray-600", label: "Draft" },
  pending: { color: "bg-amber-50 text-amber-600", label: "Pending" },
  approved: { color: "bg-blue-50 text-blue-600", label: "Approved" },
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
    <div className="border-border bg-card rounded-xl border p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-muted-foreground text-sm font-medium">{title}</p>
          <p className="text-foreground mt-2 text-2xl font-semibold tracking-tight">
            {isLoading ? (
              <span className="bg-muted inline-block h-8 w-20 animate-pulse rounded" />
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

export function AnalyticsContent({ user }: AnalyticsContentProps) {
  const trpc = useTRPC();

  // Query for clips stats scoped to the TikTok account(s) assigned to this user
  const { data, isLoading, refetch, isRefetching } = useQuery(
    trpc.tiktokStats.getAssignedAccountClipsStats.queryOptions(),
  );

  const totals = data?.totals ?? { views: 0, likes: 0, comments: 0, shares: 0 };
  const clips = data?.clips ?? [];
  const assignedAccounts = data?.assignedAccounts ?? [];
  const assignmentLabel =
    assignedAccounts.length === 0
      ? null
      : assignedAccounts.length === 1
        ? `@${assignedAccounts[0]?.tiktokUsername ?? ""}`
        : `${assignedAccounts.length} accounts`;

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

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="space-y-6 p-8">
          {/* Header with Refresh */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-foreground text-2xl font-semibold">
                Analytics
              </h1>
              <p className="text-muted-foreground text-sm">
                Track performance for your assigned TikTok account
                {assignmentLabel ? ` (${assignmentLabel})` : ""}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isRefetching}
              className="gap-2"
            >
              <RefreshCw
                className={`size-4 ${isRefetching ? "animate-spin" : ""}`}
              />
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
          <div className="border-border bg-card rounded-xl border shadow-sm">
            <div className="border-border border-b p-4">
              <h2 className="text-foreground font-semibold">
                Clip Performance
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-border bg-muted/30 border-b">
                    <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium tracking-wider uppercase">
                      Title
                    </th>
                    <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium tracking-wider uppercase">
                      Status
                    </th>
                    <th className="text-muted-foreground px-4 py-3 text-right text-xs font-medium tracking-wider uppercase">
                      <div className="flex items-center justify-end gap-1">
                        <Eye className="size-3" />
                        Views
                      </div>
                    </th>
                    <th className="text-muted-foreground px-4 py-3 text-right text-xs font-medium tracking-wider uppercase">
                      <div className="flex items-center justify-end gap-1">
                        <Heart className="size-3" />
                        Likes
                      </div>
                    </th>
                    <th className="text-muted-foreground px-4 py-3 text-right text-xs font-medium tracking-wider uppercase">
                      <div className="flex items-center justify-end gap-1">
                        <MessageCircle className="size-3" />
                        Comments
                      </div>
                    </th>
                    <th className="text-muted-foreground px-4 py-3 text-right text-xs font-medium tracking-wider uppercase">
                      <div className="flex items-center justify-end gap-1">
                        <Share2 className="size-3" />
                        Shares
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-muted-foreground px-4 py-8 text-center"
                      >
                        Loading statistics...
                      </td>
                    </tr>
                  ) : clips.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-muted-foreground px-4 py-8 text-center"
                      >
                        {assignedAccounts.length === 0
                          ? "No TikTok account assigned. Ask an admin to link you to an account."
                          : "No clips found for your assigned TikTok account yet."}
                      </td>
                    </tr>
                  ) : (
                    clips.map((clip) => (
                      <tr key={clip.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <p className="text-foreground font-medium">
                            {clip.title}
                          </p>
                          {clip.tiktokAccount && (
                            <p className="text-muted-foreground text-xs">
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
                        <td className="text-foreground px-4 py-3 text-right tabular-nums">
                          {clip.stats?.views.toLocaleString() ?? "-"}
                        </td>
                        <td className="text-foreground px-4 py-3 text-right tabular-nums">
                          {clip.stats?.likes.toLocaleString() ?? "-"}
                        </td>
                        <td className="text-foreground px-4 py-3 text-right tabular-nums">
                          {clip.stats?.comments.toLocaleString() ?? "-"}
                        </td>
                        <td className="text-foreground px-4 py-3 text-right tabular-nums">
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
                <strong>Note:</strong> Statistics are synced from TikTok
                periodically. If you recently published a clip, stats may take a
                few minutes to appear.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
