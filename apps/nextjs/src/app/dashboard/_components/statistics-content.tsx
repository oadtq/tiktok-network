"use client";

import Link from "next/link";
import {
  BarChart3,
  Bookmark,
  Eye,
  Heart,
  Home,
  LogOut,
  MessageCircle,
  Video,
} from "lucide-react";

import { authClient } from "~/auth/client";

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

// Mock stats for PoC - to be replaced with real API calls
const mockClipStats = [
  {
    id: "1",
    title: "Summer Dance Challenge",
    status: "published" as const,
    views: 125000,
    likes: 8500,
    comments: 342,
    saved: 156,
    createdAt: new Date("2024-12-15"),
  },
  {
    id: "2",
    title: "Product Review - Tech Gadget",
    status: "approved" as const,
    views: 0,
    likes: 0,
    comments: 0,
    saved: 0,
    createdAt: new Date("2024-12-20"),
  },
  {
    id: "3",
    title: "Behind the Scenes",
    status: "submitted" as const,
    views: 0,
    likes: 0,
    comments: 0,
    saved: 0,
    createdAt: new Date("2024-12-25"),
  },
];

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
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
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

export function StatisticsContent({ user }: StatisticsContentProps) {
  // Mock data - in production, use real API
  const clips = mockClipStats;
  
  const totalViews = clips.reduce((sum, clip) => sum + clip.views, 0);
  const totalLikes = clips.reduce((sum, clip) => sum + clip.likes, 0);
  const totalComments = clips.reduce((sum, clip) => sum + clip.comments, 0);
  const totalSaved = clips.reduce((sum, clip) => sum + clip.saved, 0);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-border bg-sidebar">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-border px-6">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <Video className="size-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Creator</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          <NavItem icon={Home} label="Dashboard" href="/dashboard" />
          <NavItem icon={BarChart3} label="Statistics" active href="/dashboard/statistics" />

          <div className="my-4 border-t border-border" />

          <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Support
          </p>
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
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
            <button
              onClick={() => {
                void authClient.signOut().then(() => {
                  window.location.href = "/";
                });
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
        {/* <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center px-8">
            <h1 className="text-xl font-semibold text-foreground">Statistics</h1>
          </div>
        </header> */}

        <div className="space-y-6 p-8">
          {/* Summary Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Views" value={totalViews} icon={Eye} accentColor="#3b82f6" />
            <StatCard title="Total Likes" value={totalLikes} icon={Heart} accentColor="#ec4899" />
            <StatCard title="Total Comments" value={totalComments} icon={MessageCircle} accentColor="#10b981" />
            <StatCard title="Total Saved" value={totalSaved} icon={Bookmark} accentColor="#f59e0b" />
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
                        <Bookmark className="size-3" />
                        Saved
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {clips.map((clip) => (
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
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">
                        {clip.views.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">
                        {clip.likes.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">
                        {clip.comments.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">
                        {clip.saved.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
