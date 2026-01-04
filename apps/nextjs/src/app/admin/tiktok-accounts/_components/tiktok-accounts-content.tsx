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
  Plus,
  RefreshCw,
  Smartphone,
  Users,
  Video,
  X,
  Edit,
  Trash2,
} from "lucide-react";

import { Button } from "@everylab/ui/button";
import { Input } from "@everylab/ui/input";
import { Label } from "@everylab/ui/label";

import { authClient } from "~/auth/client";
import { useTRPC } from "~/trpc/react";

interface User {
  id: string;
  name: string;
  email: string;
}

interface TiktokAccountsContentProps {
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

export function TiktokAccountsContent({ user }: TiktokAccountsContentProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", tiktokUsername: "" });

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: accounts, isLoading, refetch } = useQuery(
    trpc.tiktokAccount.list.queryOptions()
  );

  const { data: cloudPhones } = useQuery(
    trpc.cloudPhone.list.queryOptions()
  );

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

  const toggleActiveMutation = useMutation(
    trpc.tiktokAccount.toggleActive.mutationOptions({
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
          <NavItem icon={Smartphone} label="Cloud Phones" href="/admin/cloud-phones" />
          <NavItem icon={Video} label="TikTok Accounts" active href="/admin/tiktok-accounts" />
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
              <h1 className="text-xl font-semibold text-foreground">TikTok Accounts</h1>
              <p className="text-sm text-muted-foreground">
                Manage TikTok accounts and cloud phone assignments
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
                onClick={() => {
                  setFormData({ name: "", tiktokUsername: "" });
                  setIsCreateModalOpen(true);
                }}
              >
                <Plus className="size-4" />
                Add Account
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
                        Account
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Status
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
                    {accounts?.map((account) => (
                      <tr
                        key={account.id}
                        className="group transition-colors hover:bg-muted/30"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-sm font-medium text-white">
                              {account.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {account.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                @{account.tiktokUsername}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleActiveMutation.mutate({ id: account.id })}
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                              account.isActive
                                ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {account.isActive ? "Active" : "Inactive"}
                          </button>
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
                                onClick={() => handleAssign(null)}
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
                              account.userTiktokAccounts.map((uta) => (
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
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(account)}
                            >
                              <Edit className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this account?")) {
                                  deleteMutation.mutate({ id: account.id });
                                }
                              }}
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(!accounts || accounts.length === 0) && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <Video className="mx-auto size-12 text-muted-foreground/50" />
                          <p className="mt-4 text-sm text-muted-foreground">
                            No TikTok accounts found
                          </p>
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
