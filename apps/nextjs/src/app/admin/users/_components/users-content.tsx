"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  LayoutDashboard,
  Link2,
  Plus,
  RefreshCw,
  Users,
  Video,
  X,
} from "lucide-react";

import { Button } from "@everylab/ui/button";

import { useTRPC } from "~/trpc/react";
import { Sidebar } from "~/components/sidebar";
import type { NavItem } from "~/components/sidebar";
import { adminNavItems } from "~/config/navigation";

interface User {
  id: string;
  name: string;
  email: string;
}

interface UsersContentProps {
  user: User;
}

const roleConfig: Record<string, { color: string; label: string }> = {
  admin: { color: "bg-purple-50 text-purple-600", label: "Admin" },
  creator: { color: "bg-blue-50 text-blue-600", label: "Creator" },
};

export function UsersContent({ user }: UsersContentProps) {
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: users, isLoading, refetch } = useQuery(
    trpc.user.list.queryOptions()
  );

  const { data: availableAccounts } = useQuery(
    trpc.user.availableAccounts.queryOptions(
      { userId: selectedUserId ?? "" },
      { enabled: !!selectedUserId && isLinkModalOpen }
    )
  );

  const linkMutation = useMutation(
    trpc.user.linkAccount.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.user.list.queryKey() });
        setIsLinkModalOpen(false);
        setSelectedUserId(null);
      },
    })
  );

  const unlinkMutation = useMutation(
    trpc.user.unlinkAccount.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.user.list.queryKey() });
      },
    })
  );

  const handleLinkClick = (userId: string) => {
    setSelectedUserId(userId);
    setIsLinkModalOpen(true);
  };

  const handleLinkAccount = (accountId: string) => {
    if (selectedUserId) {
      linkMutation.mutate({
        userId: selectedUserId,
        tiktokAccountId: accountId,
      });
    }
  };

  const handleUnlink = (userId: string, accountId: string) => {
    unlinkMutation.mutate({ userId, tiktokAccountId: accountId });
  };

  // Get pending count for badge
  const { data: pendingClips = [] } = useQuery(trpc.admin.pendingClips.queryOptions());

  // Add badge to Dashboard item
  const navItems: NavItem[] = adminNavItems.map((item) => {
    if (item.label === "Dashboard") {
      return { ...item, badge: pendingClips.length };
    }
    return item;
  });

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        user={{ ...user, role: "admin" }}
        title="Admin"
        logoIcon={LayoutDashboard}
        items={navItems}
        bottomContent={
          <>
            <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Switch View
            </p>
            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Video className="size-5" />
              Creator Dashboard
            </Link>
          </>
        }
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center justify-between px-8">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Users</h1>
              <p className="text-sm text-muted-foreground">
                Manage users and their TikTok account assignments
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => void refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </header>

        <div className="p-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        User
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Role
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Linked TikTok Accounts
                      </th>
                      <th className="px-6 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users?.map((u) => (
                      <tr
                        key={u.id}
                        className="group transition-colors hover:bg-muted/30"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-medium text-white">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {u.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {u.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                              roleConfig[u.role]?.color ?? "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {roleConfig[u.role]?.label ?? u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            {u.linkedAccounts.length > 0 ? (
                              u.linkedAccounts.map((account) => (
                                <div
                                  key={account.id}
                                  className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                                >
                                  <Check className="size-3" />
                                  @{account.tiktokUsername}
                                  <button
                                    onClick={() => handleUnlink(u.id, account.id)}
                                    className="ml-1 rounded-full p-0.5 hover:bg-primary/20"
                                    title="Unlink account"
                                  >
                                    <X className="size-3" />
                                  </button>
                                </div>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                No accounts linked
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => handleLinkClick(u.id)}
                          >
                            <Plus className="size-3" />
                            Link Account
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {(!users || users.length === 0) && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center">
                          <Users className="mx-auto size-12 text-muted-foreground/50" />
                          <p className="mt-4 text-sm text-muted-foreground">
                            No users found
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Link Account Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Link TikTok Account
              </h2>
              <button
                onClick={() => {
                  setIsLinkModalOpen(false);
                  setSelectedUserId(null);
                }}
                className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-2">
              {availableAccounts?.map((account) => (
                <button
                  key={account.id}
                  onClick={() => handleLinkAccount(account.id)}
                  className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-sm font-medium text-white">
                    {account.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{account.name}</p>
                    <p className="text-sm text-muted-foreground">
                      @{account.tiktokUsername}
                    </p>
                  </div>
                  {account.geelarkEnvId && (
                    <div className="ml-auto flex items-center gap-1 text-xs text-emerald-600">
                      <Link2 className="size-3" />
                      Cloud Phone
                    </div>
                  )}
                </button>
              ))}
              {(!availableAccounts || availableAccounts.length === 0) && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No available TikTok accounts to link
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
