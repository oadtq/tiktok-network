"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Edit,
  ExternalLink,
  Heart,
  LayoutDashboard,
  Link2,
  MessageCircle,
  Play,
  Plus,
  RefreshCw,
  Share2,
  Smartphone,
  Trash2,
  UserPlus,
  Users,
  Video,
  X,
} from "lucide-react";

import { Button } from "@everylab/ui/button";
import { Input } from "@everylab/ui/input";
import { Label } from "@everylab/ui/label";

import type { NavItem } from "~/components/sidebar";
import { Sidebar } from "~/components/sidebar";
import { adminNavItems } from "~/config/navigation";
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

  // Manual CRUD states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const [formData, setFormData] = useState({ name: "", tiktokUsername: "" });

  const processedCodeRef = useRef<string | null>(null);

  // Details Side Panel states
  const [detailsAccountId, setDetailsAccountId] = useState<string | null>(null);
  const [clipsPage, setClipsPage] = useState(0);
  const [expandedClipId, setExpandedClipId] = useState<string | null>(null);
  const [selectedUserToLink, setSelectedUserToLink] = useState<string>("");

  // Confirmation states
  const [confirmAction, setConfirmAction] = useState<{
    type: "disconnect" | "delete";
    accountId: string;
    accountName: string;
  } | null>(null);
  const [confirmInput, setConfirmInput] = useState("");

  // Check if TikTok OAuth is configured
  const { data: oauthConfig } = useQuery(
    trpc.tiktokOAuth.isConfigured.queryOptions(),
  );

  // Get all TikTok accounts
  const {
    data: accounts,
    isLoading,
    refetch,
  } = useQuery(trpc.tiktokAccount.list.queryOptions());

  // Get cloud phones for linking
  const { data: cloudPhones } = useQuery(trpc.cloudPhone.list.queryOptions());

  // Get account details
  const { data: accountStats } = useQuery(
    trpc.tiktokAccount.getStats.queryOptions(
      { id: detailsAccountId ?? "" },
      { enabled: !!detailsAccountId },
    ),
  );

  const { data: accountClipsData, isLoading: isLoadingClips } = useQuery(
    trpc.tiktokAccount.getClips.queryOptions(
      {
        id: detailsAccountId ?? "",
        limit: 20,
        offset: clipsPage * 20,
      },
      { enabled: !!detailsAccountId },
    ),
  );

  const { data: linkedUsers, refetch: refetchLinkedUsers } = useQuery(
    trpc.tiktokAccount.getLinkedUsers.queryOptions(
      { id: detailsAccountId ?? "" },
      { enabled: !!detailsAccountId },
    ),
  );

  const { data: allUsers } = useQuery(trpc.admin.users.queryOptions());

  // OAuth mutations
  const getAuthUrl = useMutation(
    trpc.tiktokOAuth.getAuthorizationUrl.mutationOptions(),
  );

  const exchangeCode = useMutation(
    trpc.tiktokOAuth.exchangeCode.mutationOptions({
      onSuccess: (data) => {
        setConnectSuccess(
          data.isNew
            ? `Successfully connected new account: ${data.account?.name}`
            : `Successfully reconnected account: ${data.account?.name}`,
        );
        void queryClient.invalidateQueries({
          queryKey: trpc.tiktokAccount.list.queryKey(),
        });
        setIsConnecting(false);
        // Clear URL params
        router.replace("/admin/tiktok-accounts");
      },
      onError: (error) => {
        setConnectError(error.message);
        setIsConnecting(false);
      },
    }),
  );

  const syncAccount = useMutation(
    trpc.tiktokOAuth.syncAccountInfo.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.tiktokAccount.list.queryKey(),
        });
      },
    }),
  );

  const disconnectAccount = useMutation(
    trpc.tiktokOAuth.disconnect.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.tiktokAccount.list.queryKey(),
        });
      },
    }),
  );

  // Manual CRUD mutations
  const createMutation = useMutation(
    trpc.tiktokAccount.create.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.tiktokAccount.list.queryKey(),
        });
        setIsCreateModalOpen(false);
        setFormData({ name: "", tiktokUsername: "" });
      },
    }),
  );

  const updateMutation = useMutation(
    trpc.tiktokAccount.update.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.tiktokAccount.list.queryKey(),
        });
        setIsEditModalOpen(false);
        setSelectedAccountId(null);
        setFormData({ name: "", tiktokUsername: "" });
      },
    }),
  );

  const deleteMutation = useMutation(
    trpc.tiktokAccount.delete.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.tiktokAccount.list.queryKey(),
        });
      },
    }),
  );

  const assignToCloudPhoneMutation = useMutation(
    trpc.tiktokAccount.assignToCloudPhone.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.tiktokAccount.list.queryKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: trpc.cloudPhone.list.queryKey(),
        });
        setIsAssignModalOpen(false);
        setSelectedAccountId(null);
      },
    }),
  );

  const linkUserMutation = useMutation(
    trpc.tiktokAccount.linkUser.mutationOptions({
      onSuccess: () => {
        void refetchLinkedUsers();
        void queryClient.invalidateQueries({
          queryKey: trpc.tiktokAccount.list.queryKey(),
        });
        setSelectedUserToLink("");
      },
    }),
  );

  const unlinkUserMutation = useMutation(
    trpc.tiktokAccount.unlinkUser.mutationOptions({
      onSuccess: () => {
        void refetchLinkedUsers();
        void queryClient.invalidateQueries({
          queryKey: trpc.tiktokAccount.list.queryKey(),
        });
      },
    }),
  );

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get("code");
    const _state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      // Avoid duplicate error processing
      if (connectError === (errorDescription ?? error)) return;

      const timer = setTimeout(() => {
        console.log(
          "[TikTok OAuth] Error in callback:",
          error,
          errorDescription,
        );
        setConnectError(errorDescription ?? error);
        router.replace("/admin/tiktok-accounts");
        localStorage.removeItem("tiktok_code_verifier");
      }, 0);
      return () => clearTimeout(timer);
    }

    if (code && !isConnecting && !connectSuccess && !connectError) {
      // Prevent processing the same code multiple times
      if (processedCodeRef.current === code) return;
      processedCodeRef.current = code;

      const timer = setTimeout(() => {
        console.log(
          "[TikTok OAuth] Processing callback code:",
          code.substring(0, 10) + "...",
        );
        setIsConnecting(true);
        setConnectError(null);

        // Retrieve code verifier from localStorage
        const codeVerifier = localStorage.getItem("tiktok_code_verifier");
        if (!codeVerifier) {
          console.error(
            "[TikTok OAuth] Code verifier not found in localStorage",
          );
          setConnectError("OAuth state error: code_verifier not found");
          setIsConnecting(false);
          router.replace("/admin/tiktok-accounts");
          return;
        }

        // Exchange code for token
        const redirectUri = `${window.location.origin}/admin/tiktok-accounts`;
        exchangeCode.mutate({ code, redirectUri, codeVerifier });

        // Clear stored code verifier immediately to prevent reuse
        localStorage.removeItem("tiktok_code_verifier");
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
      const redirectUri = `${window.location.origin}/admin/tiktok-accounts`;
      console.log(
        "[Frontend] Starting OAuth flow with redirectUri:",
        redirectUri,
      );

      const result = await getAuthUrl.mutateAsync({ redirectUri });

      console.log("[Frontend] Received OAuth response:");
      console.log("  - authUrl:", result.authUrl);
      console.log("  - codeVerifier length:", result.codeVerifier.length);

      // Store code verifier in localStorage for later use
      localStorage.setItem("tiktok_code_verifier", result.codeVerifier);
      console.log("[Frontend] Stored codeVerifier in localStorage");

      // Redirect to TikTok OAuth
      console.log("[Frontend] Redirecting to TikTok...");
      window.location.href = result.authUrl;
    } catch (error) {
      console.error("[Frontend] OAuth flow error:", error);
      setConnectError(
        error instanceof Error ? error.message : "Failed to start OAuth flow",
      );
    }
  };

  const handleEditClick = (account: {
    id: string;
    name: string;
    tiktokUsername: string;
  }) => {
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

  const handleConfirm = () => {
    if (!confirmAction) return;

    if (confirmAction.type === "disconnect") {
      disconnectAccount.mutate({ accountId: confirmAction.accountId });
    } else {
      deleteMutation.mutate({ id: confirmAction.accountId });
    }
    setConfirmAction(null);
    setConfirmInput("");
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
              <h1 className="text-foreground text-xl font-semibold">
                TikTok Accounts
              </h1>
              <p className="text-muted-foreground text-sm">
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
                <RefreshCw
                  className={`size-4 ${isLoading ? "animate-spin" : ""}`}
                />
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

        <div className="space-y-6 p-8">
          {/* OAuth Not Configured Warning */}
          {!oauthConfig?.configured && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 size-5 shrink-0" />
                <div>
                  <p className="font-medium">TikTok OAuth not configured</p>
                  <p className="mt-1 text-sm">
                    Set{" "}
                    <code className="rounded bg-amber-100 px-1">
                      TIKTOK_CLIENT_KEY
                    </code>{" "}
                    and{" "}
                    <code className="rounded bg-amber-100 px-1">
                      TIKTOK_CLIENT_SECRET
                    </code>{" "}
                    environment variables to enable OAuth authentication. You
                    can still add accounts manually.
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
                      <th className="text-muted-foreground px-6 py-3.5 text-left text-xs font-medium tracking-wider uppercase">
                        Cloud Phone
                      </th>
                      <th className="text-muted-foreground px-6 py-3.5 text-left text-xs font-medium tracking-wider uppercase">
                        Linked Users
                      </th>
                      <th className="text-muted-foreground px-6 py-3.5 text-right text-xs font-medium tracking-wider uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-border divide-y">
                    {accounts?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <Video className="text-muted-foreground/50 mx-auto size-12" />
                          <p className="text-muted-foreground mt-4 text-sm">
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
                        <tr
                          key={account.id}
                          className="group hover:bg-accent/50 cursor-pointer transition-colors"
                          onClick={(e) => {
                            // Prevent opening details if clicking on actions or cloud phone buttons
                            if (
                              (e.target as HTMLElement).closest("button") ||
                              (e.target as HTMLElement).closest("a")
                            )
                              return;
                            setDetailsAccountId(account.id);
                            setClipsPage(0);
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
                                Manual
                              </span>
                            )}
                          </td>
                          <td className="text-foreground px-6 py-4">
                            {account.followerCount?.toLocaleString() ?? "-"}
                          </td>
                          <td className="px-6 py-4">
                            {account.cloudPhone ? (
                              <div className="flex items-center gap-2">
                                <div className="bg-primary/10 flex size-6 items-center justify-center rounded-full">
                                  <Check className="text-primary size-3" />
                                </div>
                                <span className="text-foreground text-sm font-medium">
                                  {account.cloudPhone.serialName}
                                </span>
                                <button
                                  onClick={() => {
                                    setSelectedAccountId(account.id);
                                    handleAssign(null);
                                  }}
                                  className="text-muted-foreground ml-1 rounded p-1 hover:bg-red-50 hover:text-red-600"
                                  title="Unlink"
                                >
                                  <X className="size-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleAssignClick(account.id)}
                                className="text-muted-foreground hover:text-primary flex items-center gap-1 text-sm"
                              >
                                <Link2 className="size-3" />
                                Assign
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Users className="text-muted-foreground size-4" />
                              <span className="text-foreground text-sm">
                                {account.userTiktokAccounts.length}{" "}
                                {account.userTiktokAccounts.length === 1
                                  ? "user"
                                  : "users"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-4">
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
                                {!account.accessToken && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditClick(account);
                                    }}
                                  >
                                    <Edit className="size-4" />
                                  </Button>
                                )}
                                {account.accessToken ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmAction({
                                        type: "disconnect",
                                        accountId: account.id,
                                        accountName: account.name,
                                      });
                                    }}
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void handleConnectAccount();
                                    }}
                                  >
                                    <ExternalLink className="size-3" />
                                    Connect
                                  </Button>
                                ) : null}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmAction({
                                      type: "delete",
                                      accountId: account.id,
                                      accountName: account.name,
                                    });
                                    setConfirmInput("");
                                  }}
                                  disabled={deleteMutation.isPending}
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              </div>
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
                How OAuth 2.0 Connection Works:
              </p>
              <ol className="mt-2 list-inside list-decimal space-y-1">
                <li>Click "Connect Account" to start the OAuth flow</li>
                <li>
                  You'll be redirected to TikTok to authorize the connection
                </li>
                <li>After authorization, you'll be redirected back here</li>
                <li>
                  The account will be saved and can be assigned to content
                  creators
                </li>
              </ol>
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Modal */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card w-full max-w-md rounded-xl p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-foreground text-lg font-semibold">
                {isCreateModalOpen
                  ? "Create TikTok Account"
                  : "Edit TikTok Account"}
              </h2>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditModalOpen(false);
                  setSelectedAccountId(null);
                  setFormData({ name: "", tiktokUsername: "" });
                }}
                className="text-muted-foreground hover:bg-accent rounded-lg p-2"
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
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="My TikTok Account"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="username">TikTok Username</Label>
                <Input
                  id="username"
                  value={formData.tiktokUsername}
                  onChange={(e) =>
                    setFormData({ ...formData, tiktokUsername: e.target.value })
                  }
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
          <div className="bg-card w-full max-w-md rounded-xl p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-foreground text-lg font-semibold">
                Assign Cloud Phone
              </h2>
              <button
                onClick={() => {
                  setIsAssignModalOpen(false);
                  setSelectedAccountId(null);
                }}
                className="text-muted-foreground hover:bg-accent rounded-lg p-2"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-2">
              {cloudPhones?.map((phone) => (
                <button
                  key={phone.id}
                  onClick={() => handleAssign(phone.id)}
                  className="border-border hover:bg-muted/50 flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors"
                >
                  <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
                    <Smartphone className="text-muted-foreground size-5" />
                  </div>
                  <div>
                    <p className="text-foreground font-medium">
                      {phone.serialName}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      #{phone.serialNo}
                    </p>
                  </div>
                </button>
              ))}
              {(!cloudPhones || cloudPhones.length === 0) && (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  No cloud phones available. Sync from GeeLark first.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

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
                <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
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

                {/* Linked Users Section */}
                <div className="mb-8 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 font-semibold">
                      <Users className="size-4" />
                      Linked Users
                    </h3>
                  </div>

                  <div className="border-border bg-card rounded-lg border p-4">
                    <div className="mb-4 flex items-end gap-3">
                      <div className="flex-1">
                        <Label
                          htmlFor="link-user"
                          className="text-muted-foreground text-xs"
                        >
                          Add User
                        </Label>
                        <select
                          id="link-user"
                          className="border-input placeholder:text-muted-foreground focus-visible:ring-ring mt-1 flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                          value={selectedUserToLink}
                          onChange={(e) =>
                            setSelectedUserToLink(e.target.value)
                          }
                        >
                          <option value="">Select a user...</option>
                          {allUsers
                            ?.filter(
                              (u) => !linkedUsers?.some((lu) => lu.id === u.id),
                            )
                            .map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.name} ({user.email})
                              </option>
                            ))}
                        </select>
                      </div>
                      <Button
                        size="sm"
                        disabled={
                          !selectedUserToLink || linkUserMutation.isPending
                        }
                        onClick={() => {
                          if (detailsAccountId && selectedUserToLink) {
                            linkUserMutation.mutate({
                              tiktokAccountId: detailsAccountId,
                              userId: selectedUserToLink,
                            });
                          }
                        }}
                      >
                        {linkUserMutation.isPending ? (
                          <RefreshCw className="size-4 animate-spin" />
                        ) : (
                          <UserPlus className="size-4" />
                        )}
                        <span className="ml-2">Link</span>
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {linkedUsers?.length === 0 ? (
                        <p className="text-muted-foreground py-2 text-center text-sm">
                          No users linked to this account
                        </p>
                      ) : (
                        linkedUsers?.map((user) => (
                          <div
                            key={user.id}
                            className="border-border bg-muted/30 flex items-center justify-between rounded-md border p-2"
                          >
                            <div className="flex items-center gap-3">
                              <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-full text-xs font-medium">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium">
                                  {user.name}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground h-8 w-8 p-0 hover:text-red-600"
                              onClick={() => {
                                if (detailsAccountId) {
                                  unlinkUserMutation.mutate({
                                    tiktokAccountId: detailsAccountId,
                                    userId: user.id,
                                  });
                                }
                              }}
                              disabled={unlinkUserMutation.isPending}
                            >
                              <X className="size-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
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
                                          <Play className="size-3" />
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
      {confirmAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border-border w-full max-w-md rounded-xl border p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3 text-amber-600">
              <div
                className={`flex size-10 items-center justify-center rounded-full ${confirmAction.type === "delete" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}
              >
                {confirmAction.type === "delete" ? (
                  <Trash2 className="size-5" />
                ) : (
                  <AlertCircle className="size-5" />
                )}
              </div>
              <h2 className="text-foreground text-lg font-semibold">
                {confirmAction.type === "delete"
                  ? "Delete Account"
                  : "Disconnect Account"}
              </h2>
            </div>

            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                {confirmAction.type === "delete"
                  ? `Are you sure you want to permanently delete "${confirmAction.accountName}"? This action cannot be undone and will remove all associations.`
                  : `Are you sure you want to disconnect "${confirmAction.accountName}"? The account will remain in the system but API access will be revoked.`}
              </p>

              {confirmAction.type === "delete" && (
                <div className="space-y-2">
                  <Label
                    htmlFor="confirm-input"
                    className="text-muted-foreground text-xs tracking-wider uppercase"
                  >
                    Type{" "}
                    <span className="text-foreground font-bold select-none">
                      {confirmAction.accountName}
                    </span>{" "}
                    to confirm
                  </Label>
                  <Input
                    id="confirm-input"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder="Enter account name"
                    className="mt-1"
                    autoFocus
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setConfirmAction(null);
                    setConfirmInput("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant={
                    confirmAction.type === "delete" ? "destructive" : "default"
                  }
                  onClick={handleConfirm}
                  disabled={
                    confirmAction.type === "delete" &&
                    confirmInput !== confirmAction.accountName
                  }
                  className={
                    confirmAction.type === "disconnect"
                      ? "bg-amber-600 text-white hover:bg-amber-700"
                      : ""
                  }
                >
                  {confirmAction.type === "delete"
                    ? "Delete Permanently"
                    : "Confirm Disconnect"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
