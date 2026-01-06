"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Eye,
  Heart,
  MessageCircle,
  Play,
  Plus,
  RefreshCw,
  Share2,
  Trash2,
  Video,
  X,
} from "lucide-react";

import { Button } from "@everylab/ui/button";

import { Sidebar } from "~/components/sidebar";
import { creatorNavItems } from "~/config/navigation";
import { useTRPC } from "~/trpc/react";

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

  // Details Side Panel states
  const [detailsAccountId, setDetailsAccountId] = useState<string | null>(null);
  const [clipsPage, setClipsPage] = useState(0);
  const [expandedClipId, setExpandedClipId] = useState<string | null>(null);

  // Confirmation states
  const [confirmDisconnect, setConfirmDisconnect] = useState<{
    accountId: string;
    accountName: string;
  } | null>(null);

  const processedCodeRef = useRef<string | null>(null);

  // Check if TikTok OAuth is configured
  const { data: oauthConfig } = useQuery(
    trpc.tiktokOAuth.creatorIsConfigured.queryOptions(),
  );

  // Get user's connected TikTok accounts
  const {
    data: accounts,
    isLoading,
    refetch,
  } = useQuery(trpc.tiktokOAuth.creatorMyAccounts.queryOptions());

  // Get account details/stats
  const { data: accountStats } = useQuery(
    trpc.tiktokAccount.creatorGetStats.queryOptions(
      { id: detailsAccountId ?? "" },
      { enabled: !!detailsAccountId },
    ),
  );

  const { data: accountClipsData, isLoading: isLoadingClips } = useQuery(
    trpc.tiktokAccount.creatorGetClips.queryOptions(
      {
        id: detailsAccountId ?? "",
        limit: 20,
        offset: clipsPage * 20,
      },
      { enabled: !!detailsAccountId },
    ),
  );

  // OAuth mutations
  const getAuthUrl = useMutation(
    trpc.tiktokOAuth.creatorGetAuthorizationUrl.mutationOptions(),
  );

  const exchangeCode = useMutation(
    trpc.tiktokOAuth.creatorExchangeCode.mutationOptions({
      onSuccess: (data) => {
        setConnectSuccess(
          data.isNew
            ? `Successfully connected new account: ${data.account?.name}`
            : `Successfully reconnected account: ${data.account?.name}`,
        );
        void queryClient.invalidateQueries({
          queryKey: trpc.tiktokOAuth.creatorMyAccounts.queryKey(),
        });
        setIsConnecting(false);
        router.replace("/dashboard/tiktok-accounts");
      },
      onError: (error) => {
        setConnectError(error.message);
        setIsConnecting(false);
      },
    }),
  );

  const syncAccount = useMutation(
    trpc.tiktokOAuth.creatorSyncAccount.mutationOptions({
      onSuccess: () => {
        // Invalidate all related queries
        void queryClient.invalidateQueries({
          queryKey: trpc.tiktokOAuth.creatorMyAccounts.queryKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: trpc.tiktokAccount.creatorGetStats.queryKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: trpc.tiktokAccount.creatorGetClips.queryKey(),
        });
      },
    }),
  );

  const disconnectAccount = useMutation(
    trpc.tiktokOAuth.creatorDisconnect.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.tiktokOAuth.creatorMyAccounts.queryKey(),
        });
        setConfirmDisconnect(null);
        setDetailsAccountId(null);
      },
    }),
  );

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      if (connectError === (errorDescription ?? error)) return;

      const timer = setTimeout(() => {
        console.log(
          "[TikTok OAuth Creator] Error in callback:",
          error,
          errorDescription,
        );
        setConnectError(errorDescription ?? error);
        router.replace("/dashboard/tiktok-accounts");
        localStorage.removeItem("tiktok_creator_code_verifier");
      }, 0);
      return () => clearTimeout(timer);
    }

    if (code && !isConnecting && !connectSuccess && !connectError) {
      if (processedCodeRef.current === code) return;
      processedCodeRef.current = code;

      const timer = setTimeout(() => {
        console.log(
          "[TikTok OAuth Creator] Processing callback code:",
          code.substring(0, 10) + "...",
        );
        setIsConnecting(true);
        setConnectError(null);

        const codeVerifier = localStorage.getItem(
          "tiktok_creator_code_verifier",
        );
        if (!codeVerifier) {
          console.error(
            "[TikTok OAuth Creator] Code verifier not found in localStorage",
          );
          setConnectError("OAuth state error: code_verifier not found");
          setIsConnecting(false);
          router.replace("/dashboard/tiktok-accounts");
          return;
        }

        const redirectUri = `${window.location.origin}/dashboard/tiktok-accounts`;
        exchangeCode.mutate({ code, redirectUri, codeVerifier });

        localStorage.removeItem("tiktok_creator_code_verifier");
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [
    searchParams,
    exchangeCode,
    router,
    isConnecting,
    connectSuccess,
    connectError,
  ]);

  const handleConnectAccount = async () => {
    setConnectError(null);
    setConnectSuccess(null);

    try {
      const redirectUri = `${window.location.origin}/dashboard/tiktok-accounts`;
      console.log(
        "[TikTok OAuth Creator] Starting OAuth flow with redirectUri:",
        redirectUri,
      );

      const result = await getAuthUrl.mutateAsync({ redirectUri });

      console.log("[TikTok OAuth Creator] Received OAuth response:");
      console.log("  - authUrl:", result.authUrl);
      console.log("  - codeVerifier length:", result.codeVerifier.length);

      localStorage.setItem("tiktok_creator_code_verifier", result.codeVerifier);
      console.log(
        "[TikTok OAuth Creator] Stored codeVerifier in localStorage",
      );

      console.log("[TikTok OAuth Creator] Redirecting to TikTok...");
      window.location.href = result.authUrl;
    } catch (error) {
      console.error("[TikTok OAuth Creator] OAuth flow error:", error);
      setConnectError(
        error instanceof Error ? error.message : "Failed to start OAuth flow",
      );
    }
  };

  const handleDisconnect = () => {
    if (confirmDisconnect) {
      disconnectAccount.mutate({ accountId: confirmDisconnect.accountId });
    }
  };

  return (
    <div className="bg-background flex min-h-screen">
      <Sidebar
        user={user}
        title="Creator"
        logoIcon={Video}
        items={creatorNavItems}
        bottomContent={
          <>
            <p className="text-muted-foreground mb-2 px-3 text-xs font-medium tracking-wider uppercase">
              Support
            </p>
          </>
        }
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 border-b backdrop-blur">
          <div className="flex h-16 items-center justify-between px-8">
            <div>
              <h1 className="text-foreground text-xl font-semibold">
                My TikTok Accounts
              </h1>
              <p className="text-muted-foreground text-sm">
                Connect your TikTok accounts to track statistics
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
              {oauthConfig?.configured && (
                <Button
                  className="gap-2"
                  onClick={handleConnectAccount}
                  disabled={getAuthUrl.isPending}
                >
                  <Plus className="size-4" />
                  Connect Account
                </Button>
              )}
            </div>
          </div>
        </header>

        <div className="space-y-6 p-8">
          {/* OAuth Not Configured Warning */}
          {!oauthConfig?.configured && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 size-5 shrink-0" />
                <div>
                  <p className="font-medium">
                    TikTok OAuth is not configured
                  </p>
                  <p className="mt-1 text-sm">
                    Please contact an administrator to enable TikTok account
                    connections.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {connectError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
              <div className="flex items-start gap-3">
                <X className="mt-0.5 size-5 shrink-0" />
                <div>
                  <p className="font-medium">Connection failed</p>
                  <p className="mt-1 text-sm">{connectError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {connectSuccess && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
              <div className="flex items-start gap-3">
                <Check className="mt-0.5 size-5 shrink-0" />
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
              <RefreshCw className="text-muted-foreground size-8 animate-spin" />
            </div>
          ) : (
            <div className="border-border bg-card rounded-xl border shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-border bg-muted/30 border-b">
                      <th className="text-muted-foreground px-6 py-3.5 text-left text-xs font-medium tracking-wider uppercase">
                        Account
                      </th>
                      <th className="text-muted-foreground px-6 py-3.5 text-left text-xs font-medium tracking-wider uppercase">
                        Status
                      </th>
                      <th className="text-muted-foreground px-6 py-3.5 text-left text-xs font-medium tracking-wider uppercase">
                        Followers
                      </th>
                      <th className="text-muted-foreground px-6 py-3.5 text-right text-xs font-medium tracking-wider uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-border divide-y">
                    {accounts?.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center">
                          <Video className="text-muted-foreground/50 mx-auto size-12" />
                          <p className="text-muted-foreground mt-4 text-sm">
                            No TikTok accounts connected
                          </p>
                          {oauthConfig?.configured && (
                            <Button
                              className="mt-4 gap-2"
                              onClick={handleConnectAccount}
                            >
                              <Plus className="size-4" />
                              Connect First Account
                            </Button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      accounts?.map((account) => (
                        <tr
                          key={account.id}
                          className="group hover:bg-accent/50 cursor-pointer transition-colors"
                          onClick={(e) => {
                            // Prevent opening details if clicking on actions
                            if (
                              (e.target as HTMLElement).closest("button")
                            )
                              return;
                            setDetailsAccountId(account.id);
                            setClipsPage(0);
                            setExpandedClipId(null);
                          }}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-sm font-medium text-white">
                                {account.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-foreground font-medium">
                                  {account.name}
                                </p>
                                <p className="text-muted-foreground text-xs">
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
                          <td className="text-foreground px-6 py-4">
                            {account.followerCount?.toLocaleString() ?? "-"}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              {account.accessToken && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    syncAccount.mutate({
                                      accountId: account.id,
                                    });
                                  }}
                                  disabled={syncAccount.isPending}
                                >
                                  <RefreshCw
                                    className={`size-3 ${syncAccount.isPending ? "animate-spin" : ""}`}
                                  />
                                  Sync
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDisconnect({
                                    accountId: account.id,
                                    accountName: account.name,
                                  });
                                }}
                              >
                                <Trash2 className="size-3" />
                                Remove
                              </Button>
                              <ChevronRight className="text-muted-foreground/30 group-hover:text-muted-foreground size-5 transition-colors" />
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
            <div className="border-border bg-muted/30 text-muted-foreground rounded-lg border p-4 text-sm">
              <p className="text-foreground font-medium">
                How TikTok Account Connection Works:
              </p>
              <ol className="mt-2 list-inside list-decimal space-y-1">
                <li>Click &quot;Connect Account&quot; to start the OAuth flow</li>
                <li>
                  You&apos;ll be redirected to TikTok to authorize the
                  connection
                </li>
                <li>After authorization, you&apos;ll be redirected back here</li>
                <li>
                  Click on a row to view detailed statistics for that account
                </li>
              </ol>
            </div>
          )}
        </div>
      </main>

      {/* Account Details Side Panel */}
      {detailsAccountId && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setDetailsAccountId(null)}
          />
          <div className="border-border bg-background fixed inset-y-0 right-0 z-50 w-full max-w-2xl border-l shadow-2xl transition-transform duration-300 ease-in-out">
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="border-border flex items-center justify-between border-b px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold">Account Details</h2>
                  <p className="text-muted-foreground text-sm">
                    {accounts?.find((a) => a.id === detailsAccountId)?.name}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDetailsAccountId(null)}
                >
                  <X className="size-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {/* Stats Cards */}
                <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
                  <div className="border-border bg-card rounded-lg border p-4">
                    <div className="text-muted-foreground flex items-center gap-2">
                      <Video className="size-4" />
                      <span className="text-xs font-medium uppercase">
                        Videos
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">
                      {accountStats?.totalVideos.toLocaleString() ?? "-"}
                    </p>
                  </div>
                  <div className="border-border bg-card rounded-lg border p-4">
                    <div className="text-muted-foreground flex items-center gap-2">
                      <Eye className="size-4" />
                      <span className="text-xs font-medium uppercase">
                        Views
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">
                      {accountStats?.totalViews.toLocaleString() ?? "-"}
                    </p>
                  </div>
                  <div className="border-border bg-card rounded-lg border p-4">
                    <div className="text-muted-foreground flex items-center gap-2">
                      <Heart className="size-4" />
                      <span className="text-xs font-medium uppercase">
                        Likes
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">
                      {accountStats?.totalLikes.toLocaleString() ?? "-"}
                    </p>
                  </div>
                  <div className="border-border bg-card rounded-lg border p-4">
                    <div className="text-muted-foreground flex items-center gap-2">
                      <Share2 className="size-4" />
                      <span className="text-xs font-medium uppercase">
                        Shares
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">
                      {accountStats?.totalShares.toLocaleString() ?? "-"}
                    </p>
                  </div>
                  <div className="border-border bg-card rounded-lg border p-4">
                    <div className="text-muted-foreground flex items-center gap-2">
                      <MessageCircle className="size-4" />
                      <span className="text-xs font-medium uppercase">
                        Comments
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">
                      {accountStats?.totalComments.toLocaleString() ?? "-"}
                    </p>
                  </div>
                </div>

                {/* Clips Table */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Recent Clips</h3>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={clipsPage === 0 || isLoadingClips}
                        onClick={() => setClipsPage((p) => Math.max(0, p - 1))}
                      >
                        Previous
                      </Button>
                      <span className="text-muted-foreground text-sm">
                        Page {clipsPage + 1}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={
                          !accountClipsData?.clips.length ||
                          accountClipsData.clips.length < 20 ||
                          isLoadingClips
                        }
                        onClick={() => setClipsPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>

                  {isLoadingClips ? (
                    <div className="flex justify-center py-8">
                      <RefreshCw className="text-muted-foreground size-6 animate-spin" />
                    </div>
                  ) : !accountClipsData?.clips.length ? (
                    <div className="border-border bg-muted/30 text-muted-foreground rounded-lg border p-8 text-center">
                      No clips found for this account
                    </div>
                  ) : (
                    <div className="border-border rounded-lg border">
                      <table className="w-full">
                        <thead className="bg-muted/30 text-muted-foreground text-xs uppercase">
                          <tr>
                            <th className="px-4 py-3 text-left">Video</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-right">Published</th>
                            <th className="w-10 px-4 py-3"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-border divide-y">
                          {accountClipsData.clips.map((clip) => (
                            <Fragment key={clip.id}>
                              <tr
                                className="hover:bg-muted/30 cursor-pointer"
                                onClick={() =>
                                  setExpandedClipId(
                                    expandedClipId === clip.id ? null : clip.id,
                                  )
                                }
                              >
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded">
                                      <Play className="size-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium">
                                        {clip.title}
                                      </p>
                                      <div className="text-muted-foreground flex items-center gap-3 text-xs">
                                        <span className="flex items-center gap-1">
                                          <Eye className="size-3" />
                                          {clip.latestStats?.views.toLocaleString() ??
                                            0}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                      clip.status === "published"
                                        ? "bg-emerald-50 text-emerald-700"
                                        : clip.status === "failed"
                                          ? "bg-red-50 text-red-700"
                                          : "bg-blue-50 text-blue-700"
                                    }`}
                                  >
                                    {clip.status}
                                  </span>
                                </td>
                                <td className="text-muted-foreground px-4 py-3 text-right text-xs">
                                  {clip.publishedAt
                                    ? new Date(
                                        clip.publishedAt,
                                      ).toLocaleDateString()
                                    : "-"}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {expandedClipId === clip.id ? (
                                    <ChevronUp className="text-muted-foreground size-4" />
                                  ) : (
                                    <ChevronDown className="text-muted-foreground size-4" />
                                  )}
                                </td>
                              </tr>
                              {expandedClipId === clip.id && (
                                <tr className="bg-muted/20">
                                  <td colSpan={4} className="px-4 py-4">
                                    <div className="grid grid-cols-4 gap-4">
                                      <div className="text-center">
                                        <div className="text-muted-foreground mb-1 text-xs">
                                          Views
                                        </div>
                                        <div className="font-semibold">
                                          {clip.latestStats?.views.toLocaleString() ??
                                            0}
                                        </div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-muted-foreground mb-1 text-xs">
                                          Likes
                                        </div>
                                        <div className="font-semibold">
                                          {clip.latestStats?.likes.toLocaleString() ??
                                            0}
                                        </div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-muted-foreground mb-1 text-xs">
                                          Shares
                                        </div>
                                        <div className="font-semibold">
                                          {clip.latestStats?.shares.toLocaleString() ??
                                            0}
                                        </div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-muted-foreground mb-1 text-xs">
                                          Comments
                                        </div>
                                        <div className="font-semibold">
                                          {clip.latestStats?.comments.toLocaleString() ??
                                            0}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Confirmation Modal */}
      {confirmDisconnect && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border-border w-full max-w-md rounded-xl border p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Trash2 className="size-5" />
              </div>
              <h2 className="text-foreground text-lg font-semibold">
                Remove TikTok Account
              </h2>
            </div>

            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Are you sure you want to remove{" "}
                <strong>&quot;{confirmDisconnect.accountName}&quot;</strong> from
                your connected accounts? This will stop tracking statistics for
                this account.
              </p>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setConfirmDisconnect(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDisconnect}
                  disabled={disconnectAccount.isPending}
                >
                  {disconnectAccount.isPending ? "Removing..." : "Remove"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
