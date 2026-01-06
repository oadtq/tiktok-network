"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Pencil,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  Video,
} from "lucide-react";

import { Button } from "@everylab/ui/button";
import { toast } from "@everylab/ui/toast";

import type { ProxyFormValues } from "./proxy-form-modal";
import type { NavItem } from "~/components/sidebar";
import { Sidebar } from "~/components/sidebar";
import { adminNavItems } from "~/config/navigation";
import { useTRPC } from "~/trpc/react";
import { ProxyAssignmentsModal } from "./proxy-assignments-modal";
import { ProxyFormModal } from "./proxy-form-modal";

interface User {
  id: string;
  name: string;
  email: string;
}

interface ProxiesContentProps {
  user: User;
}

export function ProxiesContent({ user }: ProxiesContentProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editProxyId, setEditProxyId] = useState<string | null>(null);
  const [assignProxyId, setAssignProxyId] = useState<string | null>(null);

  const {
    data: proxies = [],
    isLoading,
    refetch,
  } = useQuery(trpc.proxy.list.queryOptions());

  const { data: cloudPhones = [] } = useQuery(
    trpc.cloudPhone.list.queryOptions(),
  );

  const syncMutation = useMutation(
    trpc.proxy.sync.mutationOptions({
      onSuccess: (res) => {
        toast.success(`Synced ${res.synced} proxies from GeeLark`);
        void queryClient.invalidateQueries({
          queryKey: trpc.proxy.list.queryKey(),
        });
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const addMutation = useMutation(
    trpc.proxy.add.mutationOptions({
      onSuccess: (res) => {
        toast.success(`Created ${res.successAmount} proxies`);
        setCreateOpen(false);
        void queryClient.invalidateQueries({
          queryKey: trpc.proxy.list.queryKey(),
        });
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.proxy.update.mutationOptions({
      onSuccess: () => {
        toast.success("Proxy updated");
        setEditProxyId(null);
        void queryClient.invalidateQueries({
          queryKey: trpc.proxy.list.queryKey(),
        });
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const deleteMutation = useMutation(
    trpc.proxy.delete.mutationOptions({
      onSuccess: (res) => {
        toast.success(`Deleted ${res.deletedIds.length} proxies`);
        void queryClient.invalidateQueries({
          queryKey: trpc.proxy.list.queryKey(),
        });
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const setAssignmentsMutation = useMutation(
    trpc.proxy.setAssignments.mutationOptions({
      onSuccess: () => {
        toast.success("Assignments saved");
        setAssignProxyId(null);
        void queryClient.invalidateQueries({
          queryKey: trpc.proxy.list.queryKey(),
        });
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const { data: pendingClips = [] } = useQuery(
    trpc.admin.pendingClips.queryOptions(),
  );

  const navItems: NavItem[] = useMemo(
    () =>
      adminNavItems.map((item) =>
        item.label === "Dashboard"
          ? { ...item, badge: pendingClips.length }
          : item,
      ),
    [pendingClips.length],
  );

  const editProxy = proxies.find((p) => p.id === editProxyId) ?? null;
  const assignProxy = proxies.find((p) => p.id === assignProxyId) ?? null;

  const editDefaults: ProxyFormValues = {
    scheme: editProxy?.scheme ?? "socks5",
    server: editProxy?.server ?? "",
    port: editProxy?.port ?? 8000,
    username: editProxy?.username ?? undefined,
  };

  const createDefaults: ProxyFormValues = {
    scheme: "socks5",
    server: "",
    port: 8000,
  };

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

      <main className="flex-1 overflow-auto">
        <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 border-b backdrop-blur">
          <div className="flex h-16 items-center justify-between px-8">
            <div>
              <h1 className="text-foreground text-xl font-semibold">
                Proxy Management
              </h1>
              <p className="text-muted-foreground text-sm">
                Manage GeeLark proxies and assign up to 3 cloud phones per proxy
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
                variant="outline"
                className="gap-2"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="size-4" />
                Add Proxy
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
                        Proxy
                      </th>
                      <th className="text-muted-foreground px-6 py-3.5 text-left text-xs font-medium tracking-wider uppercase">
                        Username
                      </th>
                      <th className="text-muted-foreground px-6 py-3.5 text-left text-xs font-medium tracking-wider uppercase">
                        Assigned Cloud Phones
                      </th>
                      <th className="text-muted-foreground px-6 py-3.5 text-right text-xs font-medium tracking-wider uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-border divide-y">
                    {proxies.map((p) => (
                      <tr
                        key={p.id}
                        className="group hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
                              <Shield className="text-muted-foreground size-5" />
                            </div>
                            <div>
                              <p className="text-foreground font-medium">
                                {p.server}:{p.port}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {p.scheme} • id {p.id}
                                {p.serialNo ? ` • #${p.serialNo}` : ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {p.username ? (
                            <span className="text-foreground text-sm">
                              {p.username}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            {p.assignedCloudPhones.length > 0 ? (
                              p.assignedCloudPhones.map((cp) => (
                                <span
                                  key={cp.id}
                                  className="border-border bg-muted/40 text-foreground inline-flex max-w-[240px] items-center truncate rounded-full border px-2.5 py-1 text-xs font-medium"
                                  title={cp.id}
                                >
                                  {cp.serialName ?? cp.id}
                                </span>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                Not assigned
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAssignProxyId(p.id)}
                            >
                              Assign
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => setEditProxyId(p.id)}
                            >
                              <Pencil className="size-3" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => {
                                const ok = window.confirm(
                                  `Delete proxy ${p.scheme}://${p.server}:${p.port} (id ${p.id}) from GeeLark?`,
                                );
                                if (!ok) return;
                                deleteMutation.mutate({ ids: [p.id] });
                              }}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="size-3" />
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {proxies.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center">
                          <Shield className="text-muted-foreground/50 mx-auto size-12" />
                          <p className="text-muted-foreground mt-4 text-sm">
                            No proxies found
                          </p>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      <ProxyFormModal
        key="create-proxy"
        open={createOpen}
        mode="create"
        title="Add Proxy"
        description="Creates the proxy in GeeLark, then caches it locally."
        submitLabel={addMutation.isPending ? "Creating..." : "Create"}
        defaultValues={createDefaults}
        submitDisabled={addMutation.isPending}
        onClose={() => setCreateOpen(false)}
        onSubmit={(values) => addMutation.mutate({ list: [values] })}
      />

      <ProxyFormModal
        key={`edit-proxy-${editProxyId ?? "none"}`}
        open={editProxyId !== null && editProxy !== null}
        mode="edit"
        title="Edit Proxy"
        description="Updates the proxy in GeeLark, then refreshes the cache."
        submitLabel={updateMutation.isPending ? "Saving..." : "Save"}
        defaultValues={editDefaults}
        submitDisabled={updateMutation.isPending}
        onClose={() => setEditProxyId(null)}
        onSubmit={(values) => {
          if (!editProxy) return;
          updateMutation.mutate({
            list: [
              {
                id: editProxy.id,
                scheme: values.scheme,
                server: values.server,
                port: values.port,
                ...(values.username !== undefined
                  ? { username: values.username }
                  : {}),
                ...(values.password !== undefined
                  ? { password: values.password }
                  : {}),
              },
            ],
          });
        }}
      />

      <ProxyAssignmentsModal
        key={`assign-proxy-${assignProxyId ?? "none"}`}
        open={assignProxyId !== null && assignProxy !== null}
        proxy={
          assignProxy
            ? {
                id: assignProxy.id,
                server: assignProxy.server,
                port: assignProxy.port,
                scheme: assignProxy.scheme,
              }
            : null
        }
        cloudPhones={cloudPhones}
        defaultSelectedIds={(assignProxy?.assignedCloudPhones ?? []).map(
          (c) => c.id,
        )}
        submitDisabled={setAssignmentsMutation.isPending}
        onClose={() => setAssignProxyId(null)}
        onSave={({ cloudPhoneIds, reassign }) => {
          if (!assignProxy) return;
          setAssignmentsMutation.mutate({
            proxyId: assignProxy.id,
            cloudPhoneIds,
            reassign,
          });
        }}
      />
    </div>
  );
}
