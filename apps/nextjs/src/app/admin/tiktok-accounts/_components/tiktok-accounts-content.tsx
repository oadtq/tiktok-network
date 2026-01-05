"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  Edit,
  ExternalLink,
  LayoutDashboard,
  Link2,
  Plus,
  RefreshCw,
  Smartphone,
  Trash2,
  Video,
  X,
} from "lucide-react";

import { Button } from "@everylab/ui/button";
import { Input } from "@everylab/ui/input";
import { Label } from "@everylab/ui/label";

import { useTRPC } from "~/trpc/react";
import { Sidebar } from "~/components/sidebar";
import type { NavItem } from "~/components/sidebar";
import { adminNavItems } from "~/config/navigation";

interface User {
  id: string;
  name: string;
  email: string;
}

interface TikTokAccountsContentProps {
  user: User;
}

export function TikTokAccountsContent({ user }: TikTokAccountsContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // OAuth states
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectSuccess, setConnectSuccess] = useState<string | null>(null);

  // Manual CRUD states  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", tiktokUsername: "" });

  // Check if TikTok OAuth is configured
  const { data: oauthConfig } = useQuery(
    trpc.tiktokOAuth.isConfigured.queryOptions()
  );

  // Get all TikTok accounts
  const { data: accounts, isLoading, refetch } = useQuery(
    trpc.tiktokAccount.list.queryOptions()
  );

  // Get cloud phones for linking
  const { data: cloudPhones } = useQuery(
    trpc.cloudPhone.list.queryOptions()
  );

  // OAuth mutations
  const getAuthUrl = useMutation(
    trpc.tiktokOAuth.getAuthorizationUrl.mutationOptions()
  );

  const exchangeCode = useMutation(
    trpc.tiktokOAuth.exchangeCode.mutationOptions({
      onSuccess: (data) => {
        setConnectSuccess(
          data.isNew
            ? `Successfully connected new account: ${data.account?.name}`
            : `Successfully reconnected account: ${data.account?.name}`
        );
        void queryClient.invalidateQueries({ queryKey: trpc.tiktokAccount.list.queryKey() });
        setIsConnecting(false);
        // Clear URL params
        router.replace("/admin/tiktok-accounts");
      },
      onError: (error) => {
        setConnectError(error.message);
        setIsConnecting(false);
      },
    })
  );

  const syncAccount = useMutation(
    trpc.tiktokOAuth.syncAccountInfo.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.tiktokAccount.list.queryKey() });
      },
    })
  );

  const disconnectAccount = useMutation(
    trpc.tiktokOAuth.disconnect.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.tiktokAccount.list.queryKey() });
      },
    })
  );

  // Manual CRUD mutations
  const createMutation = useMutation(
    trpc.tiktokAccount.create.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.tiktokAccount.list.queryKey() });
        setIsCreateModalOpen(false);
        setFormData({ name: "", tiktokUsername: "" });
      },
    })
  );

  const updateMutation = useMutation(
    trpc.tiktokAccount.update.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.tiktokAccount.list.queryKey() });
        setIsEditModalOpen(false);
        setSelectedAccountId(null);
        setFormData({ name: "", tiktokUsername: "" });
      },
    })
  );

  const deleteMutation = useMutation(
    trpc.tiktokAccount.delete.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.tiktokAccount.list.queryKey() });
      },
    })
  );

  const assignToCloudPhoneMutation = useMutation(
    trpc.tiktokAccount.assignToCloudPhone.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.tiktokAccount.list.queryKey() });
        void queryClient.invalidateQueries({ queryKey: trpc.cloudPhone.list.queryKey() });
        setIsAssignModalOpen(false);
        setSelectedAccountId(null);
      },
    })
  );

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      // Use a timeout to avoid synchronous state update during render
      const timer = setTimeout(() => {
        setConnectError(errorDescription ?? error);
        router.replace("/admin/tiktok-accounts");
      }, 0);
      return () => clearTimeout(timer);
    }

    if (code && !isConnecting) {
      // Use timeout to avoid synchronous state update
      const timer = setTimeout(() => {
        setIsConnecting(true);
        setConnectError(null);

        // Exchange code for token
        const redirectUri = `${window.location.origin}/admin/tiktok-accounts`;
        exchangeCode.mutate({ code, redirectUri });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [searchParams, exchangeCode, router, isConnecting]);

  const handleConnectAccount = async () => {
    setConnectError(null);
    setConnectSuccess(null);

    try {
      const redirectUri = `${window.location.origin}/admin/tiktok-accounts`;
      const result = await getAuthUrl.mutateAsync({ redirectUri });

      // Redirect to TikTok OAuth
      window.location.href = result.authUrl;
    } catch (error) {
      setConnectError(error instanceof Error ? error.message : "Failed to start OAuth flow");
    }
  };

  const handleEditClick = (account: { id: string; name: string; tiktokUsername: string }) => {
    setSelectedAccountId(account.id);
    setFormData({ name: account.name, tiktokUsername: account.tiktokUsername });
    setIsEditModalOpen(true);
  };

  const handleAssignClick = (accountId: string) => {
    setSelectedAccountId(accountId);
    setIsAssignModalOpen(true);
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (selectedAccountId) {
      updateMutation.mutate({ id: selectedAccountId, data: formData });
    }
  };

  const handleAssign = (cloudPhoneId: string | null) => {
    if (selectedAccountId) {
      assignToCloudPhoneMutation.mutate({
        tiktokAccountId: selectedAccountId,
        cloudPhoneId,
      });
    }
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
              <h1 className="text-xl font-semibold text-foreground">TikTok Accounts</h1>
              <p className="text-sm text-muted-foreground">
                {oauthConfig?.configured
                  ? "Connect and manage TikTok accounts via OAuth 2.0"
                  : "Manage TikTok accounts and cloud phone assignments"}
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
              {oauthConfig?.configured ? (
                <Button
                  className="gap-2"
                  onClick={handleConnectAccount}
                  disabled={getAuthUrl.isPending}
                >
                  <Plus className="size-4" />
                  Connect Account
                </Button>
              ) : (
                <Button
                  className="gap-2"
                  onClick={() => {
                    setFormData({ name: "", tiktokUsername: "" });
                    setIsCreateModalOpen(true);
                  }}
                >
                  <Plus className="size-4" />
                  Add Account
                </Button>
              )}
            </div>
          </div>
        </header>

        <div className="p-8 space-y-6">
          {/* OAuth Not Configured Warning */}
          {!oauthConfig?.configured && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="size-5 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">TikTok OAuth not configured</p>
                  <p className="text-sm mt-1">
                    Set <code className="rounded bg-amber-100 px-1">TIKTOK_CLIENT_KEY</code> and{" "}
                    <code className="rounded bg-amber-100 px-1">TIKTOK_CLIENT_SECRET</code> environment
                    variables to enable OAuth authentication. You can still add accounts manually.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {connectError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
              <div className="flex items-start gap-3">
                <X className="size-5 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Connection failed</p>
                  <p className="text-sm mt-1">{connectError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {connectSuccess && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
              <div className="flex items-start gap-3">
                <Check className="size-5 mt-0.5 shrink-0" />
                <p className="font-medium">{connectSuccess}</p>
              </div>
            </div>
          )}

          {/* Connecting State */}
          {isConnecting && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800">
              <div className="flex items-center gap-3">
                <RefreshCw className="size-5 animate-spin" />
                <p className="font-medium">Connecting TikTok account...</p>
              </div>
            </div>
          )}

          {/* Accounts Table */}
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
                        Account
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Status
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Followers
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Cloud Phone
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Linked Users
                      </th>
                      <th className="px-6 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {accounts?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <Video className="mx-auto size-12 text-muted-foreground/50" />
                          <p className="mt-4 text-sm text-muted-foreground">
                            No TikTok accounts yet
                          </p>
                          {oauthConfig?.configured ? (
                            <Button
                              className="mt-4 gap-2"
                              onClick={handleConnectAccount}
                            >
                              <Plus className="size-4" />
                              Connect First Account
                            </Button>
                          ) : (
                            <Button
                              className="mt-4 gap-2"
                              onClick={() => {
                                setFormData({ name: "", tiktokUsername: "" });
                                setIsCreateModalOpen(true);
                              }}
                            >
                              <Plus className="size-4" />
                              Add Your First Account
                            </Button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      accounts?.map((account) => (
                        <tr key={account.id} className="group transition-colors hover:bg-muted/30">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-sm font-medium text-white">
                                {account.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{account.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  @{account.tiktokUsername}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {account.accessToken ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600">
                                <Check className="size-3" />
                                Connected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                                <X className="size-3" />
                                Manual
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-foreground">
                            {account.followerCount?.toLocaleString() ?? "-"}
                          </td>
                          <td className="px-6 py-4">
                            {account.cloudPhone ? (
                              <div className="flex items-center gap-2">
                                <div className="flex size-6 items-center justify-center rounded-full bg-primary/10">
                                  <Check className="size-3 text-primary" />
                                </div>
                                <span className="text-sm font-medium text-foreground">
                                  {account.cloudPhone.serialName}
                                </span>
                                <button
                                  onClick={() => {
                                    setSelectedAccountId(account.id);
                                    handleAssign(null);
                                  }}
                                  className="ml-1 rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                                  title="Unlink"
                                >
                                  <X className="size-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleAssignClick(account.id)}
                                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                              >
                                <Link2 className="size-3" />
                                Assign
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {account.userTiktokAccounts.length > 0 ? (
                                account.userTiktokAccounts.map((uta: { user: { id: string; name: string } }) => (
                                  <span
                                    key={uta.user.id}
                                    className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600"
                                  >
                                    {uta.user.name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  No users
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              {account.accessToken && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => syncAccount.mutate({ accountId: account.id })}
                                  disabled={syncAccount.isPending}
                                >
                                  <RefreshCw
                                    className={`size-3 ${syncAccount.isPending ? "animate-spin" : ""}`}
                                  />
                                  Sync
                                </Button>
                              )}
                              {!account.accessToken && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditClick(account)}
                                >
                                  <Edit className="size-4" />
                                </Button>
                              )}
                              {account.accessToken ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                                  onClick={() => disconnectAccount.mutate({ accountId: account.id })}
                                  disabled={disconnectAccount.isPending}
                                >
                                  <X className="size-3" />
                                  Disconnect
                                </Button>
                              ) : oauthConfig?.configured ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1"
                                  onClick={handleConnectAccount}
                                >
                                  <ExternalLink className="size-3" />
                                  Connect
                                </Button>
                              ) : null}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this account?")) {
                                    deleteMutation.mutate({ id: account.id });
                                  }
                                }}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Help Text */}
          {oauthConfig?.configured && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">How OAuth 2.0 Connection Works:</p>
              <ol className="mt-2 list-inside list-decimal space-y-1">
                <li>Click "Connect Account" to start the OAuth flow</li>
                <li>You'll be redirected to TikTok to authorize the connection</li>
                <li>After authorization, you'll be redirected back here</li>
                <li>The account will be saved and can be assigned to content creators</li>
              </ol>
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Modal */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {isCreateModalOpen ? "Create TikTok Account" : "Edit TikTok Account"}
              </h2>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditModalOpen(false);
                  setSelectedAccountId(null);
                  setFormData({ name: "", tiktokUsername: "" });
                }}
                className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My TikTok Account"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="username">TikTok Username</Label>
                <Input
                  id="username"
                  value={formData.tiktokUsername}
                  onChange={(e) => setFormData({ ...formData, tiktokUsername: e.target.value })}
                  placeholder="username (without @)"
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setIsEditModalOpen(false);
                    setSelectedAccountId(null);
                    setFormData({ name: "", tiktokUsername: "" });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={isCreateModalOpen ? handleCreate : handleUpdate}
                  disabled={!formData.name || !formData.tiktokUsername}
                >
                  {isCreateModalOpen ? "Create" : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Cloud Phone Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Assign Cloud Phone
              </h2>
              <button
                onClick={() => {
                  setIsAssignModalOpen(false);
                  setSelectedAccountId(null);
                }}
                className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-2">
              {cloudPhones?.map((phone) => (
                <button
                  key={phone.id}
                  onClick={() => handleAssign(phone.id)}
                  className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                    <Smartphone className="size-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{phone.serialName}</p>
                    <p className="text-sm text-muted-foreground">
                      #{phone.serialNo}
                    </p>
                  </div>
                </button>
              ))}
              {(!cloudPhones || cloudPhones.length === 0) && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No cloud phones available. Sync from GeeLark first.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
