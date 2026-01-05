"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

import type { NavItem } from "~/components/sidebar";
import { Sidebar } from "~/components/sidebar";
import { adminNavItems } from "~/config/navigation";
import { useTRPC } from "~/trpc/react";

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

  const {
    data: users,
    isLoading,
    refetch,
  } = useQuery(trpc.user.list.queryOptions());

  const { data: availableAccounts } = useQuery(
    trpc.user.availableAccounts.queryOptions(
      { userId: selectedUserId ?? "" },
      { enabled: !!selectedUserId && isLinkModalOpen },
    ),
  );

  const linkMutation = useMutation(
    trpc.user.linkAccount.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.user.list.queryKey(),
        });
        setIsLinkModalOpen(false);
        setSelectedUserId(null);
      },
    }),
  );

  const unlinkMutation = useMutation(
    trpc.user.unlinkAccount.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.user.list.queryKey(),
        });
      },
    }),
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
  const { data: pendingClips = [] } = useQuery(
    trpc.admin.pendingClips.queryOptions(),
  );

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
        {/* Header */}
        <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 border-b backdrop-blur">
          <div className="flex h-16 items-center justify-between px-8">
            <div>
              <h1 className="text-foreground text-xl font-semibold">Users</h1>
              <p className="text-muted-foreground text-sm">
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
                <RefreshCw
                  className={`size-4 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>
        </header>

        <div className="p-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="text-muted-foreground size-8 animate-spin" />
            </div>
          ) : (
            <div className="border-border bg-card rounded-xl border shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-border bg-muted/30 border-b">
                      <th className="text-muted-foreground px-6 py-3.5 text-left text-xs font-medium tracking-wider uppercase">
                        User
                      </th>
                      <th className="text-muted-foreground px-6 py-3.5 text-left text-xs font-medium tracking-wider uppercase">
                        Role
                      </th>
                      <th className="text-muted-foreground px-6 py-3.5 text-left text-xs font-medium tracking-wider uppercase">
                        Linked TikTok Accounts
                      </th>
                      <th className="text-muted-foreground px-6 py-3.5 text-right text-xs font-medium tracking-wider uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-border divide-y">
                    {users?.map((u) => (
                      <tr
                        key={u.id}
                        className="group hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-medium text-white">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-foreground font-medium">
                                {u.name}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {u.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                              roleConfig[u.role]?.color ??
                              "bg-gray-100 text-gray-600"
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
                                  className="bg-primary/10 text-primary flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                                >
                                  <Check className="size-3" />@
                                  {account.tiktokUsername}
                                  <button
                                    onClick={() =>
                                      handleUnlink(u.id, account.id)
                                    }
                                    className="hover:bg-primary/20 ml-1 rounded-full p-0.5"
                                    title="Unlink account"
                                  >
                                    <X className="size-3" />
                                  </button>
                                </div>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm">
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
                          <Users className="text-muted-foreground/50 mx-auto size-12" />
                          <p className="text-muted-foreground mt-4 text-sm">
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
          <div className="bg-card w-full max-w-md rounded-xl p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-foreground text-lg font-semibold">
                Link TikTok Account
              </h2>
              <button
                onClick={() => {
                  setIsLinkModalOpen(false);
                  setSelectedUserId(null);
                }}
                className="text-muted-foreground hover:bg-accent rounded-lg p-2"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-2">
              {availableAccounts?.map((account) => (
                <button
                  key={account.id}
                  onClick={() => handleLinkAccount(account.id)}
                  className="border-border hover:bg-muted/50 flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors"
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-sm font-medium text-white">
                    {account.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-foreground font-medium">
                      {account.name}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      @{account.tiktokUsername}
                    </p>
                  </div>
                  {account.cloudPhoneId && (
                    <div className="ml-auto flex items-center gap-1 text-xs text-emerald-600">
                      <Link2 className="size-3" />
                      Cloud Phone
                    </div>
                  )}
                </button>
              ))}
              {(!availableAccounts || availableAccounts.length === 0) && (
                <p className="text-muted-foreground py-4 text-center text-sm">
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
