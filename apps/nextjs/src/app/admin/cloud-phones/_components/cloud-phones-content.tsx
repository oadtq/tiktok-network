"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  LayoutDashboard,
  Link2,
  RefreshCw,
  Smartphone,
  Video,
  Wifi,
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

interface CloudPhonesContentProps {
  user: User;
}

const statusConfig: Record<number, { color: string; label: string }> = {
  0: { color: "bg-emerald-50 text-emerald-600", label: "Running" },
  1: { color: "bg-amber-50 text-amber-600", label: "Starting" },
  2: { color: "bg-gray-100 text-gray-600", label: "Stopped" },
};

export function CloudPhonesContent({ user }: CloudPhonesContentProps) {
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedPhoneId, setSelectedPhoneId] = useState<string | null>(null);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const {
    data: cloudPhones,
    isLoading,
    refetch,
  } = useQuery(trpc.cloudPhone.list.queryOptions());

  const { data: tiktokAccounts } = useQuery(
    trpc.tiktokAccount.list.queryOptions(),
  );

  const syncMutation = useMutation(
    trpc.cloudPhone.sync.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.cloudPhone.list.queryKey(),
        });
      },
    }),
  );

  const linkMutation = useMutation(
    trpc.cloudPhone.linkToAccount.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.cloudPhone.list.queryKey(),
        });
        setIsLinkModalOpen(false);
        setSelectedPhoneId(null);
      },
    }),
  );

  const unlinkMutation = useMutation(
    trpc.cloudPhone.unlinkFromAccount.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.cloudPhone.list.queryKey(),
        });
      },
    }),
  );

  const handleLinkClick = (phoneId: string) => {
    setSelectedPhoneId(phoneId);
    setIsLinkModalOpen(true);
  };

  const handleLinkAccount = (accountId: string) => {
    if (selectedPhoneId) {
      linkMutation.mutate({
        cloudPhoneId: selectedPhoneId,
        tiktokAccountId: accountId,
      });
    }
  };

  const handleUnlink = (accountId: string) => {
    unlinkMutation.mutate({ tiktokAccountId: accountId });
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
                Cloud Phones
              </h1>
              <p className="text-muted-foreground text-sm">
                Manage GeeLark cloud phones for TikTok publishing
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
              <Button
                className="gap-2"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
              >
                <RefreshCw
                  className={`size-4 ${syncMutation.isPending ? "animate-spin" : ""}`}
                />
                Sync from GeeLark
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
                        Phone Name
                      </th>
                      <th className="text-muted-foreground px-6 py-3.5 text-left text-xs font-medium tracking-wider uppercase">
                        Status
                      </th>
                      <th className="text-muted-foreground px-6 py-3.5 text-left text-xs font-medium tracking-wider uppercase">
                        Proxy
                      </th>
                      <th className="text-muted-foreground px-6 py-3.5 text-left text-xs font-medium tracking-wider uppercase">
                        Location
                      </th>
                      <th className="text-muted-foreground px-6 py-3.5 text-left text-xs font-medium tracking-wider uppercase">
                        Linked TikTok Account
                      </th>
                      <th className="text-muted-foreground px-6 py-3.5 text-right text-xs font-medium tracking-wider uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-border divide-y">
                    {cloudPhones?.map((phone) => (
                      <tr
                        key={phone.id}
                        className="group hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
                              <Smartphone className="text-muted-foreground size-5" />
                            </div>
                            <div>
                              <p className="text-foreground font-medium">
                                {phone.serialName}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                #{phone.serialNo}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                              statusConfig[phone.status ?? 0]?.color ??
                              "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {statusConfig[phone.status ?? 0]?.label ??
                              "Unknown"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {phone.proxyServer ? (
                            <div className="flex items-center gap-2">
                              <Wifi className="text-muted-foreground size-4" />
                              <span className="text-foreground text-sm">
                                {phone.proxyServer}:{phone.proxyPort}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              No proxy
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-foreground text-sm">
                            {phone.countryName ?? "Unknown"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {phone.tiktokAccounts.length > 0 ? (
                            <div className="flex items-center gap-2">
                              <div className="bg-primary/10 flex size-6 items-center justify-center rounded-full">
                                <Check className="text-primary size-3" />
                              </div>
                              <span className="text-foreground text-sm font-medium">
                                @{phone.tiktokAccounts[0]?.tiktokUsername}
                              </span>
                              <button
                                onClick={() => {
                                  const account = phone.tiktokAccounts[0];
                                  if (account) handleUnlink(account.id);
                                }}
                                className="text-muted-foreground ml-2 rounded p-1 hover:bg-red-50 hover:text-red-600"
                                title="Unlink account"
                              >
                                <X className="size-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Not linked
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {phone.tiktokAccounts.length === 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => handleLinkClick(phone.id)}
                            >
                              <Link2 className="size-3" />
                              Link Account
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {(!cloudPhones || cloudPhones.length === 0) && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <Smartphone className="text-muted-foreground/50 mx-auto size-12" />
                          <p className="text-muted-foreground mt-4 text-sm">
                            No cloud phones found
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
                onClick={() => setIsLinkModalOpen(false)}
                className="text-muted-foreground hover:bg-accent rounded-lg p-2"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-2">
              {tiktokAccounts
                ?.filter((a) => !a.cloudPhoneId)
                .map((account) => (
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
                  </button>
                ))}
              {tiktokAccounts?.filter((a) => !a.cloudPhoneId).length === 0 && (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  All TikTok accounts are already linked
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
