"use client";

import { useState } from "react";
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

const statusColors = {
  draft: "bg-gray-500",
  submitted: "bg-yellow-500",
  approved: "bg-blue-500",
  rejected: "bg-red-500",
  publishing: "bg-purple-500",
  published: "bg-green-500",
  failed: "bg-red-600",
};

export function DashboardContent({ user }: DashboardContentProps) {
  const [clips] = useState(mockClips);

  const totalViews = clips.reduce((sum, clip) => sum + clip.views, 0);
  const totalLikes = clips.reduce((sum, clip) => sum + clip.likes, 0);
  const publishedClips = clips.filter((c) => c.status === "published").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Creator Dashboard</h1>
            <p className="text-sm text-gray-400">Welcome back, {user.name}</p>
          </div>
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
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <p className="text-sm text-gray-400">Total Clips</p>
            <p className="text-3xl font-bold text-white">{clips.length}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <p className="text-sm text-gray-400">Published</p>
            <p className="text-3xl font-bold text-green-400">{publishedClips}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <p className="text-sm text-gray-400">Total Views</p>
            <p className="text-3xl font-bold text-blue-400">
              {totalViews.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <p className="text-sm text-gray-400">Total Likes</p>
            <p className="text-3xl font-bold text-pink-400">
              {totalLikes.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">My Clips</h2>
          <Button>+ Upload New Clip</Button>
        </div>

        {/* Clips Table */}
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                  Title
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">
                  Views
                </th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">
                  Likes
                </th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">
                  Comments
                </th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">
                  Shares
                </th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {clips.map((clip) => (
                <tr
                  key={clip.id}
                  className="border-b border-white/5 transition-colors hover:bg-white/5"
                >
                  <td className="px-6 py-4">
                    <p className="font-medium text-white">{clip.title}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium text-white ${statusColors[clip.status]}`}
                    >
                      {clip.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-white">
                    {clip.views.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-white">
                    {clip.likes.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-white">
                    {clip.comments.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-white">
                    {clip.shares.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-400">
                    {clip.createdAt.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Performance Chart Placeholder */}
        <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <h3 className="mb-4 text-lg font-semibold text-white">
            Performance Over Time
          </h3>
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-white/20">
            <p className="text-gray-500">
              📊 Chart visualization coming soon...
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
