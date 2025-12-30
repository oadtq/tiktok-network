"use client";

import { useState } from "react";
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

export function AdminDashboardContent({ user }: AdminDashboardContentProps) {
  const [overview] = useState(mockOverview);
  const [topClips] = useState(mockTopClips);
  const [pendingClips] = useState(mockPendingClips);
  const [campaigns] = useState(mockCampaigns);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-sm text-gray-400">Welcome, {user.name}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href="/dashboard">Creator View</a>
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                await authClient.signOut();
                window.location.href = "/";
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Overview Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-4 lg:grid-cols-8">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <p className="text-xs text-gray-400">Creators</p>
            <p className="text-2xl font-bold text-white">{overview.totalCreators}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <p className="text-xs text-gray-400">Total Clips</p>
            <p className="text-2xl font-bold text-white">{overview.totalClips}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <p className="text-xs text-gray-400">Published</p>
            <p className="text-2xl font-bold text-green-400">{overview.publishedClips}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <p className="text-xs text-gray-400">Pending Review</p>
            <p className="text-2xl font-bold text-yellow-400">{overview.pendingReview}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <p className="text-xs text-gray-400">Total Views</p>
            <p className="text-2xl font-bold text-blue-400">
              {(overview.totalViews / 1000000).toFixed(1)}M
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <p className="text-xs text-gray-400">Total Likes</p>
            <p className="text-2xl font-bold text-pink-400">
              {(overview.totalLikes / 1000).toFixed(0)}K
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <p className="text-xs text-gray-400">Active Campaigns</p>
            <p className="text-2xl font-bold text-purple-400">{overview.activeCampaigns}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <p className="text-xs text-gray-400">Total Campaigns</p>
            <p className="text-2xl font-bold text-white">{overview.totalCampaigns}</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Pending Review */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Pending Review</h2>
              <span className="rounded-full bg-yellow-500/20 px-2 py-1 text-xs text-yellow-400">
                {pendingClips.length} pending
              </span>
            </div>
            <div className="space-y-3">
              {pendingClips.map((clip) => (
                <div
                  key={clip.id}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4"
                >
                  <div>
                    <p className="font-medium text-white">{clip.title}</p>
                    <p className="text-sm text-gray-400">by {clip.creator}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-green-400">
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-400">
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Performing Clips */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <h2 className="mb-4 text-lg font-semibold text-white">Top Performing Clips</h2>
            <div className="space-y-3">
              {topClips.map((clip, index) => (
                <div
                  key={clip.id}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-white">{clip.title}</p>
                      <p className="text-sm text-gray-400">{clip.creator}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-blue-400">
                      {(clip.views / 1000000).toFixed(1)}M views
                    </p>
                    <p className="text-sm text-gray-400">
                      {(clip.likes / 1000).toFixed(0)}K likes
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Campaigns */}
        <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Campaigns</h2>
            <Button>+ New Campaign</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                    Campaign
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">
                    Clips
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">
                    Creators
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">
                    Total Views
                  </th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr
                    key={campaign.id}
                    className="border-b border-white/5 transition-colors hover:bg-white/5"
                  >
                    <td className="px-4 py-3 font-medium text-white">
                      {campaign.name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          campaign.status === "active"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-white">
                      {campaign.clips}
                    </td>
                    <td className="px-4 py-3 text-right text-white">
                      {campaign.creators}
                    </td>
                    <td className="px-4 py-3 text-right text-white">
                      {campaign.totalViews > 0
                        ? `${(campaign.totalViews / 1000000).toFixed(1)}M`
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
