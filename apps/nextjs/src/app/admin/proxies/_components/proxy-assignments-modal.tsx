"use client";

import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";

import { Button } from "@everylab/ui/button";

interface CloudPhoneLite {
  id: string;
  serialName: string | null;
  serialNo: string | null;
  countryName: string | null;
  status: number | null;
}

export function ProxyAssignmentsModal(props: {
  open: boolean;
  proxy: { id: string; server: string; port: number; scheme: string } | null;
  cloudPhones: CloudPhoneLite[];
  defaultSelectedIds: string[];
  submitDisabled?: boolean;
  onClose: () => void;
  onSave: (args: { cloudPhoneIds: string[]; reassign: boolean }) => void;
}) {
  const {
    open,
    proxy,
    cloudPhones,
    defaultSelectedIds,
    submitDisabled,
    onClose,
    onSave,
  } = props;

  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(defaultSelectedIds);
  const [reassign, setReassign] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cloudPhones;
    return cloudPhones.filter((p) => {
      const haystack =
        `${p.serialName ?? ""} ${p.serialNo ?? ""} ${p.id} ${p.countryName ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [cloudPhones, query]);

  if (!open || !proxy) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card w-full max-w-2xl rounded-xl p-6 shadow-lg">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-foreground text-lg font-semibold">
              Assign Cloud Phones
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {proxy.scheme}://{proxy.server}:{proxy.port} — pick up to 3
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:bg-accent rounded-lg p-2"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <div className="border-border bg-background flex flex-1 items-center gap-2 rounded-lg border px-3 py-2">
            <Search className="text-muted-foreground size-4" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, id, country..."
              className="text-foreground placeholder:text-muted-foreground w-full bg-transparent text-sm outline-none"
            />
          </div>
          <div className="text-muted-foreground text-sm">
            {selectedIds.length}/3 selected
          </div>
        </div>

        <div className="border-border max-h-[420px] overflow-auto rounded-xl border">
          <div className="divide-border divide-y">
            {filtered.map((p) => {
              const selected = selectedIds.includes(p.id);
              const canSelectMore = selected || selectedIds.length < 3;

              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={!canSelectMore}
                  onClick={() => {
                    setSelectedIds((prev) => {
                      if (prev.includes(p.id))
                        return prev.filter((x) => x !== p.id);
                      if (prev.length >= 3) return prev;
                      return [...prev, p.id];
                    });
                  }}
                  className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors ${
                    selected ? "bg-muted/30" : "hover:bg-muted/30"
                  } ${!canSelectMore ? "opacity-50" : ""}`}
                >
                  <div className="min-w-0">
                    <div className="text-foreground flex items-center gap-2 font-medium">
                      <span className="truncate">
                        {p.serialName ?? "(unnamed)"}
                      </span>
                      {p.serialNo ? (
                        <span className="text-muted-foreground text-xs">
                          #{p.serialNo}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-muted-foreground mt-0.5 text-xs">
                      {p.countryName ?? "Unknown"} • {p.id}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selected ? (
                      <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium">
                        <Check className="size-3" />
                        Selected
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        {canSelectMore ? "Select" : "Max 3"}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            {filtered.length === 0 ? (
              <div className="text-muted-foreground px-4 py-10 text-center text-sm">
                No cloud phones match your search.
              </div>
            ) : null}
          </div>
        </div>

        <label className="mt-4 flex items-center gap-3">
          <input
            type="checkbox"
            checked={reassign}
            onChange={(e) => setReassign(e.target.checked)}
            className="border-border text-primary size-4 rounded"
          />
          <div className="min-w-0">
            <div className="text-foreground text-sm font-medium">
              Force reassign
            </div>
            <div className="text-muted-foreground text-xs">
              If a cloud phone is already assigned to another proxy, move it
              here.
            </div>
          </div>
        </label>

        <div className="flex items-center justify-end gap-3 pt-5">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave({ cloudPhoneIds: selectedIds, reassign })}
            disabled={submitDisabled}
          >
            Save assignments
          </Button>
        </div>
      </div>
    </div>
  );
}
