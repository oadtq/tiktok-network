"use client";

import { useQuery } from "@tanstack/react-query";
import { Video } from "lucide-react";

import { useTRPC } from "~/trpc/react";

function AccountChip(props: {
  username: string;
  name: string;
  isActive: boolean;
  hasCloudPhone: boolean;
}) {
  const readiness =
    props.isActive && props.hasCloudPhone
      ? { label: "Ready", className: "bg-emerald-100 text-emerald-700" }
      : !props.isActive
        ? { label: "Inactive", className: "bg-red-100 text-red-700" }
        : { label: "Not ready", className: "bg-amber-100 text-amber-700" };

  return (
    <div className="border-border bg-card flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
      <span className="text-foreground text-sm font-semibold">
        @{props.username}
      </span>
      <span className="text-muted-foreground text-sm">({props.name})</span>
      <span
        className={`rounded-full px-2 py-0.5 text-xs ${readiness.className}`}
      >
        {readiness.label}
      </span>
    </div>
  );
}

export function AssignedTikTokAccount() {
  const trpc = useTRPC();
  const { data, isLoading, isError } = useQuery(
    trpc.tiktokAccount.myAssigned.queryOptions(),
  );

  return (
    <section className="border-border bg-card mb-6 rounded-xl border p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
            <Video className="size-5" />
          </div>
          <div>
            <h2 className="text-foreground text-sm font-semibold">
              Assigned TikTok account
            </h2>
            <p className="text-muted-foreground text-sm">
              This is the TikTok account you’re assigned to publish on.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="bg-muted h-10 w-full animate-pulse rounded-lg" />
        ) : isError ? (
          <p className="text-muted-foreground text-sm">
            Couldn’t load your assignment.
          </p>
        ) : !data || data.length === 0 ? (
          <div className="border-border bg-muted/30 rounded-lg border border-dashed p-4">
            <p className="text-foreground text-sm font-medium">
              No TikTok account assigned
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              Ask an admin to link you to a TikTok account.
            </p>
          </div>
        ) : data.length === 1 ? (
          <AccountChip
            username={data[0]?.tiktokUsername ?? ""}
            name={data[0]?.name ?? ""}
            isActive={Boolean(data[0]?.isActive)}
            hasCloudPhone={Boolean(data[0]?.cloudPhoneId)}
          />
        ) : (
          <div className="space-y-2">
            {data.map((a) => (
              <AccountChip
                key={a.id}
                username={a.tiktokUsername}
                name={a.name}
                isActive={a.isActive}
                hasCloudPhone={Boolean(a.cloudPhoneId)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
