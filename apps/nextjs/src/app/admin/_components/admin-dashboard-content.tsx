"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Check,
  Clock,
  Eye,
  FileVideo,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Plus,
  Settings,
  TrendingUp,
  Users,
  Video,
  X,
} from "lucide-react";

import { Button } from "@everylab/ui/button";

import { authClient } from "~/auth/client";

interface User {
  id: string;
  name: string;
  email: string;
}

interface AdminDashboardContentProps {
  user: User;
}

// Mock data for admin dashboard
const mockOverview = {
  totalCreators: 156,
  totalClips: 1247,
  publishedClips: 892,
  pendingReview: 34,
  totalViews: 12500000,
  totalLikes: 890000,
  activeCampaigns: 5,
  totalCampaigns: 12,
};

const mockTopClips = [
  {
    id: "1",
    title: "Viral Dance Challenge",
    creator: "Sarah Johnson",
    views: 2500000,
    likes: 180000,
    status: "published",
  },
  {
    id: "2",
    title: "Product Unboxing Special",
    creator: "Mike Chen",
    views: 1800000,
    likes: 125000,
    status: "published",
  },
  {
    id: "3",
    title: "Comedy Skit - Office Life",
    creator: "Emma Davis",
    views: 1200000,
    likes: 95000,
    status: "published",
  },
  {
    id: "4",
    title: "Makeup Tutorial",
    creator: "Lisa Wang",
    views: 980000,
    likes: 72000,
    status: "published",
  },
  {
    id: "5",
    title: "Fitness Routine",
    creator: "James Wilson",
    views: 750000,
    likes: 58000,
    status: "published",
  },
];

const mockPendingClips = [
  {
    id: "p1",
    title: "New Recipe Video",
    creator: "Chef Mario",
    submittedAt: new Date("2024-12-27"),
    status: "submitted",
  },
  {
    id: "p2",
    title: "Travel Vlog - Paris",
    creator: "Anna Miller",
    submittedAt: new Date("2024-12-28"),
    status: "submitted",
  },
  {
    id: "p3",
    title: "Gaming Stream Highlights",
    creator: "Tyler Pro",
    submittedAt: new Date("2024-12-28"),
    status: "submitted",
  },
];

const mockCampaigns = [
  {
    id: "c1",
    name: "Holiday Season 2024",
    status: "active",
    clips: 45,
    creators: 28,
    totalViews: 3500000,
  },
  {
    id: "c2",
    name: "New Year Countdown",
    status: "active",
    clips: 23,
    creators: 15,
    totalViews: 1200000,
  },
  {
    id: "c3",
    name: "Product Launch - TechX",
    status: "draft",
    clips: 0,
    creators: 0,
    totalViews: 0,
  },
];

// Mock sparkline data
const viewsSparkline = [8, 9, 10, 9.5, 11, 10.5, 12, 11.5, 12.5, 12, 13, 12.5];
const likesSparkline = [600, 650, 700, 680, 750, 720, 800, 780, 850, 820, 890, 880];

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
  badge,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  href?: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className="size-5" />
        {label}
      </div>
      {badge !== undefined && badge > 0 && (
        <span
          className={`flex size-5 items-center justify-center rounded-full text-xs font-medium ${
            active
              ? "bg-primary-foreground/20 text-primary-foreground"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

const statusConfig = {
  active: {
    color: "bg-emerald-50 text-emerald-600",
    label: "Active",
  },
  draft: {
    color: "bg-gray-100 text-gray-600",
    label: "Draft",
  },
  completed: {
    color: "bg-blue-50 text-blue-600",
    label: "Completed",
  },
  paused: {
    color: "bg-amber-50 text-amber-600",
    label: "Paused",
  },
};

export function AdminDashboardContent({ user }: AdminDashboardContentProps) {
  const [overview] = useState(mockOverview);
  const [topClips] = useState(mockTopClips);
  const [pendingClips] = useState(mockPendingClips);
  const [campaigns] = useState(mockCampaigns);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-border bg-sidebar">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-border px-6">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <LayoutDashboard className="size-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Admin</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          <NavItem
            icon={Home}
            label="Dashboard"
            active
            href="/admin"
          />
          <NavItem icon={Users} label="Creators" href="/admin/creators" />
          <NavItem
            icon={FileVideo}
            label="All Clips"
            href="/admin/clips"
          />
          <NavItem
            icon={Clock}
            label="Pending Review"
            href="/admin/pending"
            badge={pendingClips.length}
          />
          <NavItem icon={Megaphone} label="Campaigns" href="/admin/campaigns" />
          <NavItem icon={BarChart3} label="Analytics" href="/admin/analytics" />

          <div className="my-4 border-t border-border" />

          <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Switch View
          </p>
          <NavItem icon={Video} label="Creator Dashboard" href="/dashboard" />
        </nav>

        {/* User Profile */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-medium text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-foreground">
                {user.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">Admin</p>
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
                Admin Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="gap-2">
                <Plus className="size-4" />
                New Campaign
              </Button>
            </div>
          </div>
        </header>

        <div className="p-8">
          {/* Stats Grid - 4 columns */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Creators"
              value={overview.totalCreators}
              icon={Users}
              trend={{ value: "8 this week", positive: true }}
              accentColor="#6366f1"
            />
            <StatCard
              title="Total Clips"
              value={overview.totalClips}
              subtitle={`${overview.publishedClips} published`}
              icon={Video}
              accentColor="#8b5cf6"
            />
            <StatCard
              title="Total Views"
              value={`${(overview.totalViews / 1000000).toFixed(1)}M`}
              icon={Eye}
              trend={{ value: "15.3%", positive: true }}
              sparkline={viewsSparkline}
              accentColor="#3b82f6"
            />
            <StatCard
              title="Total Likes"
              value={`${(overview.totalLikes / 1000).toFixed(0)}K`}
              icon={Heart}
              trend={{ value: "12.1%", positive: true }}
              sparkline={likesSparkline}
              accentColor="#ec4899"
            />
          </div>

          {/* Quick Stats Row */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex size-12 items-center justify-center rounded-full bg-amber-50">
                <Clock className="size-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {overview.pendingReview}
                </p>
                <p className="text-sm text-muted-foreground">Pending Review</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50">
                <TrendingUp className="size-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {overview.activeCampaigns}
                </p>
                <p className="text-sm text-muted-foreground">Active Campaigns</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex size-12 items-center justify-center rounded-full bg-blue-50">
                <Megaphone className="size-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {overview.totalCampaigns}
                </p>
                <p className="text-sm text-muted-foreground">Total Campaigns</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex size-12 items-center justify-center rounded-full bg-purple-50">
                <BarChart3 className="size-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">7.1%</p>
                <p className="text-sm text-muted-foreground">Avg Engagement</p>
              </div>
            </div>
          </div>

          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            {/* Pending Review */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-foreground">Pending Review</h2>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-600">
                  {pendingClips.length} pending
                </span>
              </div>
              <div className="space-y-3">
                {pendingClips.map((clip) => (
                  <div
                    key={clip.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                        <Video className="size-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {clip.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          by {clip.creator} •{" "}
                          {clip.submittedAt.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition-colors hover:bg-emerald-100">
                        <Check className="size-4" />
                      </button>
                      <button className="flex size-8 items-center justify-center rounded-lg bg-red-50 text-red-600 transition-colors hover:bg-red-100">
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {pendingClips.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No clips pending review
                  </p>
                )}
              </div>
            </div>

            {/* Top Performing Clips */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-foreground">
                  Top Performing Clips
                </h2>
                <Button variant="ghost" size="sm" className="text-primary">
                  View all
                </Button>
              </div>
              <div className="space-y-3">
                {topClips.slice(0, 4).map((clip, index) => (
                  <div
                    key={clip.id}
                    className="flex items-center gap-4 rounded-lg p-2 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-muted-foreground">
                      #{index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {clip.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {clip.creator}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">
                        {(clip.views / 1000000).toFixed(1)}M
                      </p>
                      <p className="text-xs text-muted-foreground">views</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-emerald-600">
                        {((clip.likes / clip.views) * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">rate</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Campaigns Table */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-semibold text-foreground">Campaigns</h2>
              <Button size="sm" className="gap-2">
                <Plus className="size-4" />
                New Campaign
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Campaign
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Clips
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Creators
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Total Views
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Engagement
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {campaigns.map((campaign) => (
                    <tr
                      key={campaign.id}
                      className="group transition-colors hover:bg-muted/30"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
                            <Megaphone className="size-5 text-indigo-600" />
                          </div>
                          <p className="font-medium text-foreground">
                            {campaign.name}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            statusConfig[campaign.status as keyof typeof statusConfig]?.color ??
                            "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {statusConfig[campaign.status as keyof typeof statusConfig]?.label ??
                            campaign.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-foreground">
                        {campaign.clips}
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-foreground">
                        {campaign.creators}
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-foreground">
                        {campaign.totalViews > 0
                          ? `${(campaign.totalViews / 1000000).toFixed(1)}M`
                          : "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {campaign.totalViews > 0 ? (
                          <span className="font-medium text-emerald-600">
                            6.8%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
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
