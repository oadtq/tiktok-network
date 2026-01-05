"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react";

import { Button } from "@everylab/ui/button";

import { useTRPC } from "~/trpc/react";

type TaskStatus =
  | "waiting"
  | "in_progress"
  | "completed"
  | "failed"
  | "cancelled";

const statusConfig: Record<
  TaskStatus,
  { icon: React.ElementType; color: string; label: string }
> = {
  waiting: {
    icon: Clock,
    color: "text-amber-600 bg-amber-50",
    label: "Waiting",
  },
  in_progress: {
    icon: Loader2,
    color: "text-blue-600 bg-blue-50",
    label: "In Progress",
  },
  completed: {
    icon: CheckCircle,
    color: "text-emerald-600 bg-emerald-50",
    label: "Completed",
  },
  failed: { icon: XCircle, color: "text-red-600 bg-red-50", label: "Failed" },
  cancelled: {
    icon: AlertCircle,
    color: "text-gray-600 bg-gray-50",
    label: "Cancelled",
  },
};

const taskTypeLabels: Record<number, string> = {
  1: "Video Posting",
  2: "Account Warmup",
  3: "Carousel Posting",
  4: "Account Login",
  6: "Profile Editing",
  42: "Custom",
};

export function RecentTaskLogs() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>("all");
  const [deviceFilter, setDeviceFilter] = useState<string>("all");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data: cloudPhones } = useQuery(trpc.cloudPhone.list.queryOptions());

  const taskTypeFilterNum = useMemo(() => {
    if (taskTypeFilter === "all") return undefined;
    const n = Number(taskTypeFilter);
    return Number.isFinite(n) ? n : undefined;
  }, [taskTypeFilter]);

  const { data: tasksData, isLoading } = useQuery(
    trpc.admin.getTasks.queryOptions({
      limit: 100,
      offset: 0,
      status: statusFilter === "all" ? undefined : statusFilter,
      taskType: taskTypeFilterNum,
      cloudPhoneId: deviceFilter === "all" ? undefined : deviceFilter,
      sortBy: "scheduled",
      sortDir,
    }),
  );

  const cancelMutation = useMutation(
    trpc.admin.cancelTask.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.admin.getTasks.queryKey(),
        });
      },
    }),
  );

  const retryMutation = useMutation(
    trpc.admin.retryTask.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.admin.getTasks.queryKey(),
        });
      },
    }),
  );

  const { data: taskDetail, isLoading: isLoadingDetail } = useQuery({
    ...trpc.admin.getTaskDetail.queryOptions({ taskId: selectedTaskId ?? "" }),
    enabled: !!selectedTaskId,
  });

  const tasks = tasksData?.tasks ?? [];

  const clearFilters = () => {
    setStatusFilter("all");
    setTaskTypeFilter("all");
    setDeviceFilter("all");
    setSortDir("desc");
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-foreground text-lg font-semibold">
          Recent Task Logs
          {tasksData && (
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              ({tasksData.total} total)
            </span>
          )}
        </h2>
      </div>

      <div className="border-border bg-card mb-4 flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-end md:justify-between">
        <div className="grid w-full gap-3 md:grid-cols-4">
          <div>
            <p className="text-muted-foreground mb-1 text-xs">Task Type</p>
            <select
              className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 text-sm focus-visible:ring-[3px]"
              value={taskTypeFilter}
              onChange={(e) => setTaskTypeFilter(e.target.value)}
            >
              <option value="all">All</option>
              {Object.entries(taskTypeLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-muted-foreground mb-1 text-xs">Task Status</p>
            <select
              className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 text-sm focus-visible:ring-[3px]"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as TaskStatus | "all")
              }
            >
              <option value="all">All</option>
              <option value="waiting">Waiting</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <p className="text-muted-foreground mb-1 text-xs">Device</p>
            <select
              className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 text-sm focus-visible:ring-[3px]"
              value={deviceFilter}
              onChange={(e) => setDeviceFilter(e.target.value)}
            >
              <option value="all">All</option>
              {(cloudPhones ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.serialName ?? p.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-muted-foreground mb-1 text-xs">Sort</p>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between"
              onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
            >
              Scheduled {sortDir === "desc" ? "↓" : "↑"}
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="text-muted-foreground size-8 animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="border-border bg-card flex flex-col items-center justify-center rounded-xl border py-16">
          <Clock className="text-muted-foreground size-12" />
          <h3 className="text-foreground mt-4 text-lg font-semibold">
            No Tasks Found
          </h3>
          <p className="text-muted-foreground mt-2 max-w-md text-center">
            Use the filters above, or click &quot;Refresh from GeeLark&quot; to
            sync recent tasks.
          </p>
        </div>
      ) : (
        <div className="border-border bg-card overflow-hidden rounded-xl border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium tracking-wider uppercase">
                  Status
                </th>
                <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium tracking-wider uppercase">
                  Type
                </th>
                <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium tracking-wider uppercase">
                  Plan Name
                </th>
                <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium tracking-wider uppercase">
                  Device
                </th>
                <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium tracking-wider uppercase">
                  Scheduled
                </th>
                <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium tracking-wider uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {tasks.map((task) => {
                const status = statusConfig[task.status as TaskStatus];
                const StatusIcon = status.icon;
                const canCancel =
                  task.status === "waiting" || task.status === "in_progress";
                const canRetry =
                  task.status === "failed" || task.status === "cancelled";

                return (
                  <tr key={task.id} className="hover:bg-muted/25">
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.color}`}
                      >
                        <StatusIcon
                          className={`size-3.5 ${task.status === "in_progress" ? "animate-spin" : ""}`}
                        />
                        {status.label}
                      </span>
                    </td>
                    <td className="text-foreground px-4 py-3 text-sm">
                      {taskTypeLabels[task.taskType] ?? `Type ${task.taskType}`}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedTaskId(task.id)}
                        className="text-foreground hover:text-primary text-sm font-medium hover:underline"
                      >
                        {task.planName ?? `Task ${task.id.slice(0, 8)}...`}
                      </button>
                      {task.failDesc && (
                        <p className="mt-0.5 text-xs text-red-600">
                          {task.failDesc}
                        </p>
                      )}
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-sm">
                      {task.cloudPhone?.serialName ??
                        task.serialName ??
                        task.cloudPhoneId?.slice(0, 8) ??
                        "—"}
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-sm">
                      {task.scheduleAt ? task.scheduleAt.toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {canCancel && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              cancelMutation.mutate({ taskId: task.id })
                            }
                            disabled={cancelMutation.isPending}
                            className="h-7 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            <XCircle className="mr-1 size-3" />
                            Cancel
                          </Button>
                        )}
                        {canRetry && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              retryMutation.mutate({ taskId: task.id })
                            }
                            disabled={retryMutation.isPending}
                            className="h-7 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <RotateCcw className="mr-1 size-3" />
                            Retry
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedTaskId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSelectedTaskId(null)}
        >
          <div
            className="bg-background max-h-[80vh] w-full max-w-2xl overflow-auto rounded-xl p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Task Details</h3>
              <button
                onClick={() => setSelectedTaskId(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            {isLoadingDetail ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="text-muted-foreground size-6 animate-spin" />
              </div>
            ) : taskDetail ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground text-xs">Task ID</p>
                    <p className="font-mono text-sm">{taskDetail.id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Status</p>
                    <p className="text-sm font-medium">
                      {taskDetail.statusName}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Type</p>
                    <p className="text-sm">{taskDetail.taskTypeName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Duration</p>
                    <p className="text-sm">
                      {taskDetail.cost ? `${taskDetail.cost}s` : "—"}
                    </p>
                  </div>
                </div>

                {taskDetail.failDesc && (
                  <div className="rounded-lg bg-red-50 p-3">
                    <p className="text-xs font-medium text-red-800">
                      Failure Reason (Code: {taskDetail.failCode})
                    </p>
                    <p className="mt-1 text-sm text-red-700">
                      {taskDetail.failDesc}
                    </p>
                  </div>
                )}

                {taskDetail.logs && taskDetail.logs.length > 0 && (
                  <div>
                    <p className="text-muted-foreground mb-2 text-xs font-medium">
                      Logs
                    </p>
                    <div className="bg-muted max-h-48 overflow-auto rounded-lg p-3 font-mono text-xs">
                      {taskDetail.logs.map((log, i) => (
                        <div key={i} className="py-0.5">
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {taskDetail.resultImages &&
                  taskDetail.resultImages.length > 0 && (
                    <div>
                      <p className="text-muted-foreground mb-2 text-xs font-medium">
                        Screenshots
                      </p>
                      <div className="flex gap-2 overflow-x-auto">
                        {taskDetail.resultImages.map((img, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={i}
                            src={img}
                            alt={`Screenshot ${i + 1}`}
                            className="h-32 rounded-lg border"
                          />
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <p className="text-muted-foreground text-center">
                Failed to load task details
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
