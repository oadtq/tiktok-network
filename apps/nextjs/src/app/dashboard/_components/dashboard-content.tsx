"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Eye,
  Heart,
  Home,
  LogOut,
  MessageCircle,
  Settings,
  Share2,
  TrendingUp,
  Upload,
  Video,
} from "lucide-react";

import { Button } from "@everylab/ui/button";

import { authClient } from "~/auth/client";

interface User {
  id: string;
  name: string;
  email: string;
}

interface DashboardContentProps {
  user: User;
}

// Mock data for the dashboard
const mockClips = [
  {
    id: "1",
    title: "Summer Dance Challenge",
    status: "published" as const,
    views: 125000,
    likes: 8500,
    comments: 342,
    shares: 156,
    createdAt: new Date("2024-12-15"),
    publishedAt: new Date("2024-12-16"),
  },
  {
    id: "2",
    title: "Product Review - Tech Gadget",
    status: "approved" as const,
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    createdAt: new Date("2024-12-20"),
    publishedAt: null,
  },
  {
    id: "3",
    title: "Behind the Scenes",
    status: "submitted" as const,
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    createdAt: new Date("2024-12-25"),
    publishedAt: null,
  },
  {
    id: "4",
    title: "New Year Countdown",
    status: "draft" as const,
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    createdAt: new Date("2024-12-28"),
    publishedAt: null,
  },
];

// Mock sparkline data
const sparklineData = [20, 35, 45, 30, 55, 40, 60, 45, 70, 55, 80, 65];

const statusConfig = {
  draft: { color: "bg-gray-100 text-gray-600", label: "Draft" },
  submitted: { color: "bg-amber-50 text-amber-600", label: "In Review" },
  approved: { color: "bg-blue-50 text-blue-600", label: "Approved" },
  rejected: { color: "bg-red-50 text-red-600", label: "Rejected" },
  publishing: { color: "bg-purple-50 text-purple-600", label: "Publishing" },
  published: { color: "bg-emerald-50 text-emerald-600", label: "Published" },
  failed: { color: "bg-red-50 text-red-700", label: "Failed" },
};

// Mini Sparkline Component
function Sparkline({
  data,
  color = "#3b82f6",
}: {
  data: number[];
  color?: string;
}) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 24;
  const padding = 2;

  const points = data
    .map((value, index) => {
      const x = padding + (index / (data.length - 1)) * (width - padding * 2);
      const y =
        height - padding - ((value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      className="overflow-visible"
      style={{ display: "block" }}
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  sparkline,
  accentColor = "#3b82f6",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: string; positive: boolean };
  sparkline?: number[];
  accentColor?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-2xl font-semibold tracking-tight text-foreground">
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
            {subtitle && (
              <span className="text-sm text-muted-foreground">{subtitle}</span>
            )}
          </div>
          {trend && (
            <p
              className={`mt-1 text-xs font-medium ${trend.positive ? "text-emerald-600" : "text-red-500"}`}
            >
              {trend.positive ? "+" : ""}
              {trend.value}
            </p>
          )}
        </div>
        <div
          className="flex size-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${accentColor}10` }}
        >
          <Icon className="size-5" style={{ color: accentColor }} />
        </div>
      </div>
      {sparkline && (
        <div className="mt-3">
          <Sparkline data={sparkline} color={accentColor} />
        </div>
      )}
    </div>
  );
}

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

export function DashboardContent({ user }: DashboardContentProps) {
  const [clips] = useState(mockClips);

  const totalViews = clips.reduce((sum, clip) => sum + clip.views, 0);
  const totalLikes = clips.reduce((sum, clip) => sum + clip.likes, 0);
  const publishedClips = clips.filter((c) => c.status === "published").length;

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
          <NavItem icon={Home} label="Dashboard" active href="/dashboard" />
          <NavItem icon={Upload} label="Upload" href="/dashboard/upload" />
          <NavItem icon={Video} label="My Clips" href="/dashboard/clips" />
          <NavItem icon={BarChart3} label="Analytics" href="/dashboard/analytics" />

          <div className="my-4 border-t border-border" />

          <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Support
          </p>
          <NavItem icon={Settings} label="Settings" href="/dashboard/settings" />
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
                Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Button className="gap-2">
                <Upload className="size-4" />
                Upload Clip
              </Button>
            </div>
          </div>
        </header>

        <div className="p-8">
          {/* Stats Grid */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Clips"
              value={clips.length}
              subtitle={`/${publishedClips} live`}
              icon={Video}
              accentColor="#6366f1"
              sparkline={[4, 4, 4, 4, 4, 4]}
            />
            <StatCard
              title="Total Views"
              value={totalViews}
              icon={Eye}
              trend={{ value: "12.5%", positive: true }}
              accentColor="#3b82f6"
              sparkline={sparklineData}
            />
            <StatCard
              title="Total Likes"
              value={totalLikes}
              icon={Heart}
              trend={{ value: "8.2%", positive: true }}
              accentColor="#ec4899"
              sparkline={[40, 50, 45, 60, 55, 70, 65, 75, 70, 80, 75, 85]}
            />
            <StatCard
              title="Engagement Rate"
              value="6.8%"
              icon={TrendingUp}
              trend={{ value: "2.1%", positive: true }}
              accentColor="#10b981"
              sparkline={[5, 5.5, 5.2, 6, 5.8, 6.5, 6.2, 6.8, 6.5, 7, 6.8, 7.2]}
            />
          </div>

          {/* Clips Section */}
          <div className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                My Clips
              </h2>
              <Button variant="ghost" size="sm" className="text-primary">
                View all
              </Button>
            </div>

            {/* Clips Table */}
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Title
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <div className="flex items-center justify-end gap-1.5">
                        <Eye className="size-3.5" />
                        Views
                      </div>
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <div className="flex items-center justify-end gap-1.5">
                        <Heart className="size-3.5" />
                        Likes
                      </div>
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <div className="flex items-center justify-end gap-1.5">
                        <MessageCircle className="size-3.5" />
                        Comments
                      </div>
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <div className="flex items-center justify-end gap-1.5">
                        <Share2 className="size-3.5" />
                        Shares
                      </div>
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {clips.map((clip) => (
                    <tr
                      key={clip.id}
                      className="group transition-colors hover:bg-muted/30"
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-foreground">
                          {clip.title}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig[clip.status].color}`}
                        >
                          {statusConfig[clip.status].label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-foreground">
                        {clip.views.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-foreground">
                        {clip.likes.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-foreground">
                        {clip.comments.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-foreground">
                        {clip.shares.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-muted-foreground">
                        {clip.createdAt.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance Section */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top Performing Clips */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="mb-4 font-semibold text-foreground">
                Top Performing
              </h3>
              <div className="space-y-4">
                {clips
                  .filter((c) => c.views > 0)
                  .sort((a, b) => b.views - a.views)
                  .slice(0, 3)
                  .map((clip, index) => (
                    <div key={clip.id} className="flex items-center gap-4">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-muted-foreground">
                        #{index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {clip.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {clip.views.toLocaleString()} views
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-emerald-600">
                          +{((clip.likes / clip.views) * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          engagement
                        </p>
                      </div>
                    </div>
                  ))}
                {clips.filter((c) => c.views > 0).length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No published clips yet
                  </p>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="mb-4 font-semibold text-foreground">
                Recent Activity
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <TrendingUp className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Summer Dance Challenge hit 125K views
                    </p>
                    <p className="text-xs text-muted-foreground">2 days ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <Video className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Product Review was approved
                    </p>
                    <p className="text-xs text-muted-foreground">5 days ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                    <Upload className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Behind the Scenes submitted for review
                    </p>
                    <p className="text-xs text-muted-foreground">1 week ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
