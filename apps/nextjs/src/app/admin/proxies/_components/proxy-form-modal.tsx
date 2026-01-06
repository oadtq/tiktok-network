"use client";

import { X } from "lucide-react";

import { Button } from "@everylab/ui/button";

export type ProxyFormValues = {
  scheme: string;
  server: string;
  port: number;
  username?: string;
  password?: string;
};

export function ProxyFormModal(props: {
  open: boolean;
  mode: "create" | "edit";
  title: string;
  description?: string;
  submitLabel: string;
  defaultValues: ProxyFormValues;
  submitDisabled?: boolean;
  onClose: () => void;
  onSubmit: (values: ProxyFormValues) => void;
}) {
  const {
    open,
    mode,
    title,
    description,
    submitLabel,
    defaultValues,
    submitDisabled,
    onClose,
    onSubmit,
  } = props;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card w-full max-w-lg rounded-xl p-6 shadow-lg">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-foreground text-lg font-semibold">{title}</h2>
            {description ? (
              <p className="text-muted-foreground mt-1 text-sm">{description}</p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:bg-accent rounded-lg p-2"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);

            const scheme = (formData.get("scheme") as string) ?? "";
            const server = (formData.get("server") as string) ?? "";
            const portRaw = (formData.get("port") as string) ?? "";
            const port = Number(portRaw);

            const usernameRaw = (formData.get("username") as string) ?? "";
            const passwordRaw = (formData.get("password") as string) ?? "";

            const username =
              usernameRaw.trim().length > 0 ? usernameRaw.trim() : undefined;
            const password =
              passwordRaw.trim().length > 0 ? passwordRaw : undefined;

            onSubmit({
              scheme: scheme.trim(),
              server: server.trim(),
              port: Number.isFinite(port) ? port : 0,
              username,
              password,
            });
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-1">
              <div className="text-foreground text-sm font-medium">Scheme</div>
              <input
                name="scheme"
                defaultValue={defaultValues.scheme}
                placeholder="socks5"
                className="border-border bg-background text-foreground focus:ring-primary w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
                required
              />
            </label>
            <label className="space-y-1">
              <div className="text-foreground text-sm font-medium">Port</div>
              <input
                name="port"
                type="number"
                min={1}
                max={65535}
                defaultValue={defaultValues.port}
                className="border-border bg-background text-foreground focus:ring-primary w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
                required
              />
            </label>
          </div>

          <label className="space-y-1">
            <div className="text-foreground text-sm font-medium">Server</div>
            <input
              name="server"
              defaultValue={defaultValues.server}
              placeholder="192.0.2.10"
              className="border-border bg-background text-foreground focus:ring-primary w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
              required
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-1">
              <div className="text-foreground text-sm font-medium">Username</div>
              <input
                name="username"
                defaultValue={defaultValues.username ?? ""}
                placeholder="optional"
                className="border-border bg-background text-foreground focus:ring-primary w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
              />
            </label>
            <label className="space-y-1">
              <div className="text-foreground text-sm font-medium">Password</div>
              <input
                name="password"
                type="password"
                defaultValue=""
                placeholder={mode === "edit" ? "leave blank to keep" : "optional"}
                className="border-border bg-background text-foreground focus:ring-primary w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitDisabled}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

