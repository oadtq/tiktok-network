"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Check,
  FileVideo,
  Home,
  LayoutDashboard,
  Link2,
  LogOut,
  Megaphone,
  RefreshCw,
  Smartphone,
  Users,
  Video,
  Wifi,
  X,
} from "lucide-react";

import { Button } from "@everylab/ui/button";

import { authClient } from "~/auth/client";
import { useTRPC } from "~/trpc/react";

interface User {
  id: string;
  name: string;
  email: string;
}

interface CloudPhonesContentProps {
  user: User;
}

// Navigation Item Component
function NavItem({
  icon: Icon,
  label,
  active = false,
  href = "#",
  badge,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  href?: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className="size-5" />
        {label}
      </div>
      {badge !== undefined && badge > 0 && (
        <span
          className={`flex size-5 items-center justify-center rounded-full text-xs font-medium ${
            active
              ? "bg-primary-foreground/20 text-primary-foreground"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {badge}
        </span>
      )}
    </Link>
  );
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

  const { data: cloudPhones, isLoading, refetch } = useQuery(
    trpc.cloudPhone.list.queryOptions()
  );

  const { data: tiktokAccounts } = useQuery(
    trpc.tiktokAccount.list.queryOptions()
  );

  const syncMutation = useMutation(
    trpc.cloudPhone.sync.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.cloudPhone.list.queryKey() });
      },
    })
  );

  const linkMutation = useMutation(
    trpc.cloudPhone.linkToAccount.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.cloudPhone.list.queryKey() });
        setIsLinkModalOpen(false);
        setSelectedPhoneId(null);
      },
    })
  );

  const unlinkMutation = useMutation(
    trpc.cloudPhone.unlinkFromAccount.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.cloudPhone.list.queryKey() });
      },
    })
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

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-border bg-sidebar">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-border px-6">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <LayoutDashboard className="size-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Admin</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          <NavItem icon={Home} label="Dashboard" href="/admin" />
          <NavItem icon={Smartphone} label="Cloud Phones" active href="/admin/cloud-phones" />
          <NavItem icon={Users} label="Users" href="/admin/users" />
          <NavItem icon={FileVideo} label="All Clips" href="/admin/clips" />
          <NavItem icon={Megaphone} label="Campaigns" href="/admin/campaigns" />
          <NavItem icon={BarChart3} label="Analytics" href="/admin/analytics" />

          <div className="my-4 border-t border-border" />

          <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Switch View
          </p>
          <NavItem icon={Video} label="Creator Dashboard" href="/dashboard" />
        </nav>

        {/* User Profile */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-medium text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-foreground">
                {user.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">Admin</p>
            </div>
            <button
              onClick={async () => {
                await authClient.signOut();
                window.location.href = "/";
              }}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center justify-between px-8">
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                Cloud Phones
              </h1>
              <p className="text-sm text-muted-foreground">
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
                <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                className="gap-2"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
              >
                <RefreshCw className={`size-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                Sync from GeeLark
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
                        Phone Name
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Status
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Proxy
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Location
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Linked TikTok Account
                      </th>
                      <th className="px-6 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {cloudPhones?.map((phone) => (
                      <tr
                        key={phone.id}
                        className="group transition-colors hover:bg-muted/30"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                              <Smartphone className="size-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {phone.serialName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                #{phone.serialNo}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                              statusConfig[phone.status ?? 0]?.color ?? "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {statusConfig[phone.status ?? 0]?.label ?? "Unknown"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {phone.proxyServer ? (
                            <div className="flex items-center gap-2">
                              <Wifi className="size-4 text-muted-foreground" />
                              <span className="text-sm text-foreground">
                                {phone.proxyServer}:{phone.proxyPort}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">No proxy</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-foreground">
                            {phone.countryName ?? "Unknown"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {phone.tiktokAccounts?.length > 0 ? (
                            <div className="flex items-center gap-2">
                              <div className="flex size-6 items-center justify-center rounded-full bg-primary/10">
                                <Check className="size-3 text-primary" />
                              </div>
                              <span className="text-sm font-medium text-foreground">
                                @{phone.tiktokAccounts[0]?.tiktokUsername}
                              </span>
                              <button
                                onClick={() => handleUnlink(phone.tiktokAccounts[0]!.id)}
                                className="ml-2 rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                                title="Unlink account"
                              >
                                <X className="size-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Not linked</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {(!phone.tiktokAccounts || phone.tiktokAccounts.length === 0) && (
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
                          <Smartphone className="mx-auto size-12 text-muted-foreground/50" />
                          <p className="mt-4 text-sm text-muted-foreground">
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
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Link TikTok Account
              </h2>
              <button
                onClick={() => setIsLinkModalOpen(false)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
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
                  </button>
                ))}
              {tiktokAccounts?.filter((a) => !a.cloudPhoneId).length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
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
