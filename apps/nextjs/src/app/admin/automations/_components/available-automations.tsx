"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, Play, Zap } from "lucide-react";

import { Button } from "@everylab/ui/button";
import { Input } from "@everylab/ui/input";

import { useTRPC } from "~/trpc/react";

type AutomationId = "post_video" | "warmup" | "random_star" | "ai_comment";

const automationTypes: {
  id: AutomationId;
  name: string;
  description: string;
  endpoint: string;
  icon: React.ElementType;
  color: string;
}[] = [
  {
    id: "post_video",
    name: "Post Video",
    description: "Publish video to TikTok via cloud phone",
    icon: Play,
    endpoint: "/open/v1/task/add",
    color: "bg-blue-100 text-blue-700",
  },
  {
    id: "warmup",
    name: "Account Warmup",
    description: "Browse videos or search to warm up account",
    icon: Zap,
    endpoint: "/open/v1/task/add",
    color: "bg-purple-100 text-purple-700",
  },
  {
    id: "random_star",
    name: "TikTok Star (Random Like)",
    description: "Auto-like videos in the feed",
    icon: Heart,
    endpoint: "/open/v1/rpa/task/tiktokRandomStar",
    color: "bg-pink-100 text-pink-700",
  },
  {
    id: "ai_comment",
    name: "TikTok AI Comment",
    description: "Auto-generate and post comments (AI or custom)",
    icon: MessageCircle,
    endpoint: "/open/v1/rpa/task/tiktokRandomComment",
    color: "bg-green-100 text-green-700",
  },
];

function toLocalDateTimeValue(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function parseLocalDateTimeToSeconds(value: string) {
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
}

export function AvailableAutomations() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState<AutomationId | null>(null);
  const active = useMemo(
    () => automationTypes.find((a) => a.id === open) ?? null,
    [open],
  );

  const { data: cloudPhones, isLoading: isLoadingPhones } = useQuery(
    trpc.cloudPhone.list.queryOptions(),
  );

  const [cloudPhoneId, setCloudPhoneId] = useState("");
  const [scheduleLocal, setScheduleLocal] = useState(() =>
    toLocalDateTimeValue(new Date(Date.now() + 60_000)),
  );

  // post_video
  const [videoUrl, setVideoUrl] = useState("");
  const [videoDesc, setVideoDesc] = useState("");
  const [planName, setPlanName] = useState("");
  const [markAI, setMarkAI] = useState(false);
  const [needShareLink, setNeedShareLink] = useState(false);

  // warmup
  const [warmupAction, setWarmupAction] = useState<
    "browse video" | "search video" | "search profile"
  >("browse video");
  const [warmupKeywords, setWarmupKeywords] = useState("");
  const [warmupDuration, setWarmupDuration] = useState(10);
  const [warmupRemark, setWarmupRemark] = useState("");

  // rpa
  const [rpaName, setRpaName] = useState("");
  const [rpaRemark, setRpaRemark] = useState("");

  // comment
  const [useAi, setUseAi] = useState<1 | 2>(1);
  const [comment, setComment] = useState("");

  const [formError, setFormError] = useState<string | null>(null);

  const triggerMutation = useMutation(
    trpc.admin.triggerAutomation.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.admin.getTasks.queryKey(),
        });
        setOpen(null);
      },
    }),
  );

  const resetForm = () => {
    setCloudPhoneId("");
    setScheduleLocal(toLocalDateTimeValue(new Date(Date.now() + 60_000)));
    setVideoUrl("");
    setVideoDesc("");
    setPlanName("");
    setMarkAI(false);
    setNeedShareLink(false);
    setWarmupAction("browse video");
    setWarmupKeywords("");
    setWarmupDuration(10);
    setWarmupRemark("");
    setRpaName("");
    setRpaRemark("");
    setUseAi(1);
    setComment("");
    setFormError(null);
  };

  const close = () => {
    setOpen(null);
    resetForm();
  };

  const submit = () => {
    if (!open) return;
    setFormError(null);

    if (!cloudPhoneId) {
      setFormError("Pick a device.");
      return;
    }

    const scheduleAt = parseLocalDateTimeToSeconds(scheduleLocal);
    if (!scheduleAt) {
      setFormError("Invalid schedule time.");
      return;
    }

    if (open === "post_video") {
      if (!videoUrl) {
        setFormError("Video URL required.");
        return;
      }

      triggerMutation.mutate({
        automationId: "post_video",
        cloudPhoneId,
        scheduleAt,
        planName: planName || undefined,
        videoUrl,
        videoDesc: videoDesc || undefined,
        markAI,
        needShareLink,
      });
      return;
    }

    if (open === "warmup") {
      const keywords =
        warmupAction === "browse video"
          ? undefined
          : warmupKeywords
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
      if (
        warmupAction !== "browse video" &&
        (!keywords || keywords.length === 0)
      ) {
        setFormError("Keywords required for search actions.");
        return;
      }

      triggerMutation.mutate({
        automationId: "warmup",
        cloudPhoneId,
        scheduleAt,
        planName: planName || undefined,
        remark: warmupRemark || undefined,
        action: warmupAction,
        keywords,
        duration: warmupDuration,
      });
      return;
    }

    if (open === "random_star") {
      triggerMutation.mutate({
        automationId: "random_star",
        cloudPhoneId,
        scheduleAt,
        name: rpaName || undefined,
        remark: rpaRemark || undefined,
      });
      return;
    }

    // ai_comment
    if (useAi === 2 && !comment.trim()) {
      setFormError("Comment required when useAi = 2.");
      return;
    }
    triggerMutation.mutate({
      automationId: "ai_comment",
      cloudPhoneId,
      scheduleAt,
      name: rpaName || undefined,
      remark: rpaRemark || undefined,
      useAi,
      comment: useAi === 2 ? comment : undefined,
    });
  };

  return (
    <>
      <h2 className="text-foreground mb-4 text-lg font-semibold">
        Available Automations
      </h2>
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        {automationTypes.map((automation) => (
          <div
            key={automation.id}
            className="border-border bg-card flex items-start gap-4 rounded-xl border p-4"
          >
            <div
              className={`flex size-10 items-center justify-center rounded-lg ${automation.color}`}
            >
              <automation.icon className="size-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-foreground font-semibold">
                {automation.name}
              </h3>
              <p className="text-muted-foreground mt-1 text-sm">
                {automation.description}
              </p>
              <p className="text-muted-foreground mt-2 font-mono text-xs">
                {automation.endpoint}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setOpen(automation.id);
                setFormError(null);
              }}
            >
              Trigger
            </Button>
          </div>
        ))}
      </div>

      {open && active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={close}
        >
          <div
            className="bg-background max-h-[85vh] w-full max-w-2xl overflow-auto rounded-xl p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  Trigger: {active.name}
                </h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  Schedules a GeeLark task immediately (or at your chosen time).
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={close}>
                Close
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-muted-foreground mb-1 block text-xs">
                  Device
                </label>
                <select
                  className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 text-sm focus-visible:ring-[3px]"
                  value={cloudPhoneId}
                  onChange={(e) => setCloudPhoneId(e.target.value)}
                  disabled={isLoadingPhones}
                >
                  <option value="">
                    {isLoadingPhones ? "Loading devices..." : "Select a device"}
                  </option>
                  {(cloudPhones ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.serialName ?? p.id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-muted-foreground mb-1 block text-xs">
                  Schedule (local)
                </label>
                <Input
                  type="datetime-local"
                  value={scheduleLocal}
                  onChange={(e) => setScheduleLocal(e.target.value)}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setScheduleLocal(
                        toLocalDateTimeValue(new Date(Date.now() + 60_000)),
                      )
                    }
                  >
                    Now (+60s)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setScheduleLocal(
                        toLocalDateTimeValue(
                          new Date(Date.now() + 10 * 60_000),
                        ),
                      )
                    }
                  >
                    +10m
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setScheduleLocal(
                        toLocalDateTimeValue(
                          new Date(Date.now() + 60 * 60_000),
                        ),
                      )
                    }
                  >
                    +1h
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-muted-foreground mb-1 block text-xs">
                  Plan / Task name (optional)
                </label>
                <Input
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="e.g. Warmup: US account"
                />
              </div>
            </div>

            {open === "post_video" && (
              <div className="mt-6 space-y-4">
                <div>
                  <label className="text-muted-foreground mb-1 block text-xs">
                    Video URL
                  </label>
                  <Input
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="text-muted-foreground mb-1 block text-xs">
                    Caption (optional)
                  </label>
                  <textarea
                    className="border-input focus-visible:border-ring focus-visible:ring-ring/50 min-h-[90px] w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
                    value={videoDesc}
                    onChange={(e) => setVideoDesc(e.target.value)}
                    placeholder="Optional caption..."
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={markAI}
                      onChange={(e) => setMarkAI(e.target.checked)}
                    />
                    markAI
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={needShareLink}
                      onChange={(e) => setNeedShareLink(e.target.checked)}
                    />
                    needShareLink
                  </label>
                </div>
              </div>
            )}

            {open === "warmup" && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-muted-foreground mb-1 block text-xs">
                    Action
                  </label>
                  <select
                    className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 text-sm focus-visible:ring-[3px]"
                    value={warmupAction}
                    onChange={(e) =>
                      setWarmupAction(
                        e.target.value as
                          | "browse video"
                          | "search video"
                          | "search profile",
                      )
                    }
                  >
                    <option value="browse video">browse video</option>
                    <option value="search video">search video</option>
                    <option value="search profile">search profile</option>
                  </select>
                </div>
                <div>
                  <label className="text-muted-foreground mb-1 block text-xs">
                    Duration (minutes)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={warmupDuration}
                    onChange={(e) => setWarmupDuration(Number(e.target.value))}
                  />
                </div>
                {warmupAction !== "browse video" && (
                  <div className="sm:col-span-2">
                    <label className="text-muted-foreground mb-1 block text-xs">
                      Keywords (comma-separated)
                    </label>
                    <Input
                      value={warmupKeywords}
                      onChange={(e) => setWarmupKeywords(e.target.value)}
                      placeholder="e.g. skincare, gym, cooking"
                    />
                  </div>
                )}
                <div className="sm:col-span-2">
                  <label className="text-muted-foreground mb-1 block text-xs">
                    Remark (optional)
                  </label>
                  <Input
                    value={warmupRemark}
                    onChange={(e) => setWarmupRemark(e.target.value)}
                    placeholder="Internal note..."
                  />
                </div>
              </div>
            )}

            {(open === "random_star" || open === "ai_comment") && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-muted-foreground mb-1 block text-xs">
                    Name (optional)
                  </label>
                  <Input
                    value={rpaName}
                    onChange={(e) => setRpaName(e.target.value)}
                    placeholder="Task name..."
                  />
                </div>
                <div>
                  <label className="text-muted-foreground mb-1 block text-xs">
                    Remark (optional)
                  </label>
                  <Input
                    value={rpaRemark}
                    onChange={(e) => setRpaRemark(e.target.value)}
                    placeholder="Internal note..."
                  />
                </div>

                {open === "ai_comment" && (
                  <>
                    <div className="sm:col-span-2">
                      <label className="text-muted-foreground mb-1 block text-xs">
                        useAi
                      </label>
                      <select
                        className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 text-sm focus-visible:ring-[3px]"
                        value={useAi}
                        onChange={(e) =>
                          setUseAi(Number(e.target.value) as 1 | 2)
                        }
                      >
                        <option value={1}>1 (AI)</option>
                        <option value={2}>2 (Custom comment)</option>
                      </select>
                    </div>
                    {useAi === 2 && (
                      <div className="sm:col-span-2">
                        <label className="text-muted-foreground mb-1 block text-xs">
                          Comment
                        </label>
                        <textarea
                          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 min-h-[90px] w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="Up to 500 chars"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {(formError ?? triggerMutation.error?.message) && (
              <div className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {formError ??
                  triggerMutation.error?.message ??
                  "Failed to trigger."}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <Button
                variant="outline"
                onClick={resetForm}
                disabled={triggerMutation.isPending}
              >
                Reset
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={close}
                  disabled={triggerMutation.isPending}
                >
                  Cancel
                </Button>
                <Button onClick={submit} disabled={triggerMutation.isPending}>
                  {triggerMutation.isPending ? "Triggering..." : "Trigger"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
