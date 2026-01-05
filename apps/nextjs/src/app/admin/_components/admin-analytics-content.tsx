"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Bookmark,
  ChevronDown,
  Clock,
  Eye,
  Heart,
  LayoutDashboard,
  MessageCircle,
  Video,
} from "lucide-react";

import { Button } from "@everylab/ui/button";

import type { NavItem } from "~/components/sidebar";
import { Sidebar } from "~/components/sidebar";
import { adminNavItems } from "~/config/navigation";
import { useTRPC } from "~/trpc/react";

interface User {
  id: string;
  name: string;
  email: string;
}

interface AdminAnalyticsContentProps {
  user: User;
}

type ClipStatus = "draft" | "pending" | "approved" | "published" | "failed";

const statusConfig: Record<ClipStatus, { color: string; label: string }> = {
  draft: { color: "bg-gray-100 text-gray-600", label: "Draft" },
  pending: { color: "bg-amber-50 text-amber-600", label: "Pending" },
  approved: { color: "bg-blue-50 text-blue-600", label: "Approved" },
  published: { color: "bg-emerald-50 text-emerald-600", label: "Published" },
  failed: { color: "bg-red-50 text-red-700", label: "Failed" },
};

function getStatusColor(status: ClipStatus): string {
  return statusConfig[status].color;
}

function getStatusLabel(status: ClipStatus): string {
  return statusConfig[status].label;
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon: Icon,
  accentColor = "#3b82f6",
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  accentColor?: string;
}) {
  return (
    <div className="border-border bg-card rounded-xl border p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-muted-foreground text-sm font-medium">{title}</p>
          <p className="text-foreground mt-2 text-2xl font-semibold tracking-tight">
            {typeof value === "number" ? value.toLocaleString() : value}
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

// Time range options for filtering stats
type TimeRange = "1d" | "7d" | "30d" | "all";

const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: "1d", label: "Past 1 Day" },
  { value: "7d", label: "Past 7 Days" },
  { value: "30d", label: "Past Month" },
  { value: "all", label: "All Time" },
];

function getDateFromRange(range: TimeRange): string | undefined {
  if (range === "all") return undefined;

  const now = new Date();
  switch (range) {
    case "1d":
      now.setDate(now.getDate() - 1);
      break;
    case "7d":
      now.setDate(now.getDate() - 7);
      break;
    case "30d":
      now.setDate(now.getDate() - 30);
      break;
  }
  return now.toISOString();
}

const CLIPS_PER_PAGE = 10;

export function AdminAnalyticsContent({ user }: AdminAnalyticsContentProps) {
  const trpc = useTRPC();
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [currentPage, setCurrentPage] = useState(0);

  // Get pending count for badge
  const { data: pendingClips = [] } = useQuery(
    trpc.admin.pendingClips.queryOptions(),
  );

  // Query for users list
  const { data: users = [] } = useQuery(trpc.admin.users.queryOptions());

  // Query for all clips stats (when "all" is selected)
  const { data: allClipsStats, isLoading: isLoadingAllStats } = useQuery(
    trpc.admin.getAllClipsStats.queryOptions(
      {
        dateFrom: getDateFromRange(timeRange),
        limit: CLIPS_PER_PAGE,
        offset: currentPage * CLIPS_PER_PAGE,
      },
      { enabled: selectedUserId === "all" },
    ),
  );

  // Query for user stats (when a specific user is selected)
  const { data: userStats } = useQuery(
    trpc.admin.getUserStats.queryOptions(
      {
        userId: selectedUserId,
        dateFrom: getDateFromRange(timeRange),
      },
      { enabled: selectedUserId !== "all" },
    ),
  );

  // Use real API data for both "all" and specific user views
  const stats =
    selectedUserId === "all"
      ? {
          totalViews: allClipsStats?.totalViews ?? 0,
          totalLikes: allClipsStats?.totalLikes ?? 0,
          totalComments: allClipsStats?.totalComments ?? 0,
          totalSaved: allClipsStats?.totalShares ?? 0,
        }
      : {
          totalViews: userStats?.totalViews ?? 0,
          totalLikes: userStats?.totalLikes ?? 0,
          totalComments: userStats?.totalComments ?? 0,
          totalSaved: userStats?.totalShares ?? 0,
        };

  const clips =
    selectedUserId === "all"
      ? (allClipsStats?.clips ?? [])
      : (userStats?.clips ?? []);

  const totalClips =
    selectedUserId === "all" ? (allClipsStats?.totalClips ?? 0) : clips.length;

  const totalPages = Math.ceil(totalClips / CLIPS_PER_PAGE);

  // Reset page when filters change
  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId);
    setCurrentPage(0);
  };

  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
    setCurrentPage(0);
  };

  // Add badge to Dashboard item
  const navItems: NavItem[] = adminNavItems.map((item) => {
    if (item.label === "Dashboard") {
      return { ...item, badge: pendingClips.length };
    }
    return item;
  });

  return (
    <div className="bg-background flex min-h-screen">
      <Sidebar
        user={{ ...user, role: "admin" }}
        title="Admin"
        logoIcon={LayoutDashboard}
        items={navItems}
        bottomContent={
          <>
            <p className="text-muted-foreground mb-2 px-3 text-xs font-medium tracking-wider uppercase">
              Switch View
            </p>
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:bg-accent hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
            >
              <Video className="size-5" />
              Creator Dashboard
            </Link>
          </>
        }
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 border-b backdrop-blur">
          <div className="flex h-16 items-center px-8">
            <h1 className="text-foreground text-xl font-semibold">Analytics</h1>
          </div>
        </header>

        <div className="space-y-6 p-8">
          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-4">
            {/* User Selector */}
            <div className="flex items-center gap-2">
              <label className="text-foreground text-sm font-medium">
                View stats for:
              </label>
              <div className="relative">
                <select
                  value={selectedUserId}
                  onChange={(e) => handleUserChange(e.target.value)}
                  className="border-border bg-card focus:border-primary focus:ring-primary appearance-none rounded-lg border px-4 py-2 pr-10 text-sm font-medium outline-none focus:ring-1"
                >
                  <option value="all">All Accounts</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
                <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
              </div>
            </div>

            {/* Time Range Selector */}
            <div className="flex items-center gap-2">
              <label className="text-foreground text-sm font-medium">
                Time range:
              </label>
              <div className="relative">
                <select
                  value={timeRange}
                  onChange={(e) =>
                    handleTimeRangeChange(e.target.value as TimeRange)
                  }
                  className="border-border bg-card focus:border-primary focus:ring-primary appearance-none rounded-lg border px-4 py-2 pr-10 text-sm font-medium outline-none focus:ring-1"
                >
                  {timeRangeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Views"
              value={stats.totalViews}
              icon={Eye}
              accentColor="#3b82f6"
            />
            <StatCard
              title="Total Likes"
              value={stats.totalLikes}
              icon={Heart}
              accentColor="#ec4899"
            />
            <StatCard
              title="Total Comments"
              value={stats.totalComments}
              icon={MessageCircle}
              accentColor="#10b981"
            />
            <StatCard
              title="Total Saved"
              value={stats.totalSaved}
              icon={Bookmark}
              accentColor="#f59e0b"
            />
          </div>

          {/* Clips Stats Table */}
          <div className="border-border bg-card rounded-xl border shadow-sm">
            <div className="border-border flex items-center justify-between border-b p-4">
              <h2 className="text-foreground font-semibold">
                Clip Performance{" "}
                {totalClips > 0 && (
                  <span className="text-muted-foreground font-normal">
                    ({totalClips} clips)
                  </span>
                )}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-border bg-muted/30 border-b">
                    <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium tracking-wider uppercase">
                      Title
                    </th>
                    {selectedUserId === "all" && (
                      <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium tracking-wider uppercase">
                        Creator
                      </th>
                    )}
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
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {isLoadingAllStats && selectedUserId === "all" ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-muted-foreground px-4 py-8 text-center"
                      >
                        <Clock className="text-muted-foreground mx-auto size-6 animate-spin" />
                        <p className="mt-2">Loading clips...</p>
                      </td>
                    </tr>
                  ) : clips.length === 0 ? (
                    <tr>
                      <td
                        colSpan={selectedUserId === "all" ? 6 : 5}
                        className="text-muted-foreground px-4 py-8 text-center"
                      >
                        No clips found{" "}
                        {timeRange !== "all" && "for this time range"}
                      </td>
                    </tr>
                  ) : (
                    clips.map((clip) => (
                      <tr key={clip.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <p className="text-foreground font-medium">
                            {clip.title}
                          </p>
                        </td>
                        {selectedUserId === "all" && (
                          <td className="px-4 py-3">
                            <p className="text-muted-foreground text-sm">
                              {(clip as { user?: { name: string } }).user
                                ?.name ?? "Unknown"}
                            </p>
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(
                              clip.status as ClipStatus,
                            )}`}
                          >
                            {getStatusLabel(clip.status as ClipStatus)}
                          </span>
                        </td>
                        <td className="text-foreground px-4 py-3 text-right tabular-nums">
                          {(clip.latestStats?.views ?? 0).toLocaleString()}
                        </td>
                        <td className="text-foreground px-4 py-3 text-right tabular-nums">
                          {(clip.latestStats?.likes ?? 0).toLocaleString()}
                        </td>
                        <td className="text-foreground px-4 py-3 text-right tabular-nums">
                          {(clip.latestStats?.comments ?? 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination (only for "all" view with multiple pages) */}
            {selectedUserId === "all" && totalPages > 1 && (
              <div className="border-border flex items-center justify-between border-t px-4 py-3">
                <p className="text-muted-foreground text-sm">
                  Showing {currentPage * CLIPS_PER_PAGE + 1} -{" "}
                  {Math.min((currentPage + 1) * CLIPS_PER_PAGE, totalClips)} of{" "}
                  {totalClips} clips
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                  >
                    Previous
                  </Button>
                  <span className="text-muted-foreground text-sm">
                    Page {currentPage + 1} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={currentPage >= totalPages - 1}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
