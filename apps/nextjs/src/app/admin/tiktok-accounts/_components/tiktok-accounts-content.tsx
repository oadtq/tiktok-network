"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  ExternalLink,
  LayoutDashboard,
  Link2,
  Plus,
  RefreshCw,
  Trash2,
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

interface TikTokAccountsContentProps {
  user: User;
}



export function TikTokAccountsContent({ user }: TikTokAccountsContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectSuccess, setConnectSuccess] = useState<string | null>(null);

  // Check if TikTok OAuth is configured
  const { data: oauthConfig } = useQuery(
    trpc.tiktokOAuth.isConfigured.queryOptions()
  );

  // Get all TikTok accounts
  const { data: accounts, isLoading, refetch } = useQuery(
    trpc.tiktokAccount.list.queryOptions()
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

  const deleteAccount = useMutation(
    trpc.tiktokAccount.delete.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.tiktokAccount.list.queryKey() });
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
                Connect and manage TikTok accounts via OAuth 2.0
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
              <Button
                className="gap-2"
                onClick={handleConnectAccount}
                disabled={!oauthConfig?.configured || getAuthUrl.isPending}
              >
                <Plus className="size-4" />
                Connect Account
              </Button>
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
                    variables to enable OAuth authentication.
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
                    <th className="px-6 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <RefreshCw className="mx-auto size-8 animate-spin text-muted-foreground" />
                      </td>
                    </tr>
                  ) : accounts?.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <Video className="mx-auto size-12 text-muted-foreground/50" />
                        <p className="mt-4 text-sm text-muted-foreground">
                          No TikTok accounts connected yet
                        </p>
                        <Button
                          className="mt-4 gap-2"
                          onClick={handleConnectAccount}
                          disabled={!oauthConfig?.configured}
                        >
                          <Plus className="size-4" />
                          Connect First Account
                        </Button>
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
                              Disconnected
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-foreground">
                          {account.followerCount?.toLocaleString() ?? "-"}
                        </td>
                        <td className="px-6 py-4">
                          {account.geelarkEnvId ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                              <Link2 className="size-3" />
                              Linked
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not linked</span>
                          )}
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
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1"
                                onClick={handleConnectAccount}
                              >
                                <ExternalLink className="size-3" />
                                Reconnect
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this account?")) {
                                  deleteAccount.mutate({ id: account.id });
                                }
                              }}
                              disabled={deleteAccount.isPending}
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

          {/* Help Text */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">How OAuth 2.0 Connection Works:</p>
            <ol className="mt-2 list-inside list-decimal space-y-1">
              <li>Click "Connect Account" to start the OAuth flow</li>
              <li>You'll be redirected to TikTok to authorize the connection</li>
              <li>After authorization, you'll be redirected back here</li>
              <li>The account will be saved and can be assigned to content creators</li>
            </ol>
          </div>
        </div>
      </main>
    </div>
  );
}
