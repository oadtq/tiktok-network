import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";
import { TikTokAccountsContent } from "./_components/tiktok-accounts-content";

export default async function TikTokAccountsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/signin");
  }

  // Check if user is admin
  const userRole = (session.user as { role?: string }).role ?? "creator";
  if (userRole !== "admin") {
    redirect("/dashboard");
  }

  return <TikTokAccountsContent user={session.user} />;
}
