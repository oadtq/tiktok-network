import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Button } from "@everylab/ui/button";

import { auth, getSession } from "~/auth/server";

export async function AuthShowcase() {
  const session = await getSession();

  if (!session) {
    return (
      <div className="flex flex-col items-center gap-4">
        <form>
          <Button
            size="lg"
            formAction={async () => {
              "use server";
              // For PoC, redirect to a simple email/password sign-up page
              await Promise.resolve();
              redirect("/auth/signin");
            }}
          >
            Sign In
          </Button>
        </form>
        <p className="text-muted-foreground text-sm">
          Sign in to manage your TikTok clips
        </p>
      </div>
    );
  }

  // Check if user is admin to show appropriate dashboard link
  const userRole = (session.user as { role?: string }).role ?? "creator";
  const dashboardLink = userRole === "admin" ? "/admin" : "/dashboard";

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <p className="text-center text-xl">
        Welcome back, <span className="font-semibold">{session.user.name}</span>!
      </p>
      <p className="text-muted-foreground text-sm">
        Role: <span className="capitalize">{userRole}</span>
      </p>

      <div className="flex gap-4">
        <Button size="lg" asChild>
          <a href={dashboardLink}>Go to Dashboard</a>
        </Button>

        <form>
          <Button
            variant="outline"
            size="lg"
            formAction={async () => {
              "use server";
              await auth.api.signOut({
                headers: await headers(),
              });
              redirect("/");
            }}
          >
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
