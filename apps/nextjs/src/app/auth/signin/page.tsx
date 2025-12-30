"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@everylab/ui/button";

export default function SignInPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const endpoint = mode === "signin" 
        ? "/api/auth/sign-in/email" 
        : "/api/auth/sign-up/email";
      
      const body = mode === "signin"
        ? { email: formData.email, password: formData.password }
        : { email: formData.email, password: formData.password, name: formData.name };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        throw new Error(data.message ?? "Authentication failed");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="container flex min-h-screen flex-col items-center justify-center py-16">
      <div className="bg-card border-border w-full max-w-md rounded-xl border p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">
            {mode === "signin" ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {mode === "signin"
              ? "Sign in to manage your TikTok clips"
              : "Join the TikTok Creator Network"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "signup" && (
            <div>
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="border-input bg-background mt-1 w-full rounded-md border px-3 py-2"
                placeholder="Your name"
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="border-input bg-background mt-1 w-full rounded-md border px-3 py-2"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="border-input bg-background mt-1 w-full rounded-md border px-3 py-2"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" disabled={isLoading}>
            {isLoading
              ? "Loading..."
              : mode === "signin"
                ? "Sign In"
                : "Create Account"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          {mode === "signin" ? (
            <p>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="text-primary font-medium hover:underline"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="text-primary font-medium hover:underline"
              >
                Sign in
              </button>
            </p>
          )}
        </div>

        <div className="mt-4 text-center">
          <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
            ← Back to home
          </Button>
        </div>
      </div>
    </main>
  );
}
