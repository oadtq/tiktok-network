"use client";

import { useState, useEffect, useRef } from "react";
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
  ChevronDown,
  ChevronUp,
  Heart,
  MessageCircle,
  Share2,
  Play,
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

  const processedCodeRef = useRef<string | null>(null);

  // Details Side Panel states
  const [detailsAccountId, setDetailsAccountId] = useState<string | null>(null);
  const [clipsPage, setClipsPage] = useState(0);
  const [expandedClipId, setExpandedClipId] = useState<string | null>(null);

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

  // Get account details
  const { data: accountStats } = useQuery(
    trpc.tiktokAccount.getStats.queryOptions(
      { id: detailsAccountId ?? "" },
      { enabled: !!detailsAccountId }
    )
  );

  const { data: accountClipsData, isLoading: isLoadingClips } = useQuery(
    trpc.tiktokAccount.getClips.queryOptions(
      {
        id: detailsAccountId ?? "",
        limit: 20,
        offset: clipsPage * 20,
      },
      { enabled: !!detailsAccountId }
    )
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
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      // Avoid duplicate error processing
      if (connectError === (errorDescription ?? error)) return;

      const timer = setTimeout(() => {
        console.log("[TikTok OAuth] Error in callback:", error, errorDescription);
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
        console.log("[TikTok OAuth] Processing callback code:", code.substring(0, 10) + "...");
        setIsConnecting(true);
        setConnectError(null);

        // Retrieve code verifier from localStorage
        const codeVerifier = localStorage.getItem("tiktok_code_verifier");
        if (!codeVerifier) {
          console.error("[TikTok OAuth] Code verifier not found in localStorage");
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
  }, [searchParams, exchangeCode, router, isConnecting, connectSuccess, connectError]);

  const handleConnectAccount = async () => {
    setConnectError(null);
    setConnectSuccess(null);

    try {
      const redirectUri = `${window.location.origin}/admin/tiktok-accounts`;
      console.log("[Frontend] Starting OAuth flow with redirectUri:", redirectUri);
      
      const result = await getAuthUrl.mutateAsync({ redirectUri });
      
      console.log("[Frontend] Received OAuth response:");
      console.log("  - authUrl:", result.authUrl);
      console.log("  - codeVerifier length:", result.codeVerifier?.length);

      // Store code verifier in localStorage for later use
      localStorage.setItem("tiktok_code_verifier", result.codeVerifier);
      console.log("[Frontend] Stored codeVerifier in localStorage");

      // Redirect to TikTok OAuth
      console.log("[Frontend] Redirecting to TikTok...");
      window.location.href = result.authUrl;
    } catch (error) {
      console.error("[Frontend] OAuth flow error:", error);
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
                        <tr 
                          key={account.id} 
                          className="group cursor-pointer transition-colors hover:bg-muted/30"
                          onClick={(e) => {
                            // Prevent opening details if clicking on actions or cloud phone buttons
                            if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("a")) return;
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

      {/* Account Details Side Panel */}
      {detailsAccountId && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setDetailsAccountId(null)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl border-l border-border bg-background shadow-2xl transition-transform duration-300 ease-in-out">
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold">Account Details</h2>
                  <p className="text-sm text-muted-foreground">
                    {accounts?.find(a => a.id === detailsAccountId)?.name}
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
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Video className="size-4" />
                      <span className="text-xs font-medium uppercase">Videos</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">
                      {accountStats?.totalVideos.toLocaleString() ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Heart className="size-4" />
                      <span className="text-xs font-medium uppercase">Likes</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">
                      {accountStats?.totalLikes.toLocaleString() ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Share2 className="size-4" />
                      <span className="text-xs font-medium uppercase">Shares</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">
                      {accountStats?.totalShares.toLocaleString() ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MessageCircle className="size-4" />
                      <span className="text-xs font-medium uppercase">Comments</span>
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
                        onClick={() => setClipsPage(p => Math.max(0, p - 1))}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {clipsPage + 1}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!accountClipsData?.clips.length || accountClipsData.clips.length < 20 || isLoadingClips}
                        onClick={() => setClipsPage(p => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>

                  {isLoadingClips ? (
                    <div className="flex justify-center py-8">
                      <RefreshCw className="size-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : !accountClipsData?.clips.length ? (
                    <div className="rounded-lg border border-border bg-muted/30 p-8 text-center text-muted-foreground">
                      No clips found for this account
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border">
                      <table className="w-full">
                        <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3 text-left">Video</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-right">Published</th>
                            <th className="px-4 py-3 w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {accountClipsData.clips.map((clip) => (
                            <>
                              <tr 
                                key={clip.id} 
                                className="cursor-pointer hover:bg-muted/30"
                                onClick={() => setExpandedClipId(expandedClipId === clip.id ? null : clip.id)}
                              >
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                                      <Play className="size-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="truncate font-medium text-sm">{clip.title}</p>
                                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                          <Play className="size-3" />
                                          {clip.latestStats?.views.toLocaleString() ?? 0}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                    clip.status === 'published' ? 'bg-emerald-50 text-emerald-700' :
                                    clip.status === 'failed' ? 'bg-red-50 text-red-700' :
                                    'bg-blue-50 text-blue-700'
                                  }`}>
                                    {clip.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                                  {clip.publishedAt ? new Date(clip.publishedAt).toLocaleDateString() : '-'}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {expandedClipId === clip.id ? (
                                    <ChevronUp className="size-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="size-4 text-muted-foreground" />
                                  )}
                                </td>
                              </tr>
                              {expandedClipId === clip.id && (
                                <tr className="bg-muted/20">
                                  <td colSpan={4} className="px-4 py-4">
                                    <div className="grid grid-cols-4 gap-4">
                                      <div className="text-center">
                                        <div className="text-xs text-muted-foreground mb-1">Views</div>
                                        <div className="font-semibold">{clip.latestStats?.views.toLocaleString() ?? 0}</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-xs text-muted-foreground mb-1">Likes</div>
                                        <div className="font-semibold">{clip.latestStats?.likes.toLocaleString() ?? 0}</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-xs text-muted-foreground mb-1">Shares</div>
                                        <div className="font-semibold">{clip.latestStats?.shares.toLocaleString() ?? 0}</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-xs text-muted-foreground mb-1">Comments</div>
                                        <div className="font-semibold">{clip.latestStats?.comments.toLocaleString() ?? 0}</div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
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
    </div>
  );
}
