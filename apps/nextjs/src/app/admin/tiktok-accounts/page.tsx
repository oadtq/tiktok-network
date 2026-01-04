import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";

import { TiktokAccountsContent } from "./_components/tiktok-accounts-content";

export default async function TiktokAccountsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/signin");
  }

  // Check if user is admin
  const userRole = (session.user as { role?: string }).role ?? "creator";
  if (userRole !== "admin") {
    redirect("/dashboard");
  }

  return <TiktokAccountsContent user={session.user} />;
}
