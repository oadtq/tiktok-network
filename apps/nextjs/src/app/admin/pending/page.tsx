import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";

import { PendingContent } from "./_components/pending-content";

export default async function PendingPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/signin");
  }

  // Check if user is admin
  const userRole = (session.user as { role?: string }).role ?? "creator";
  if (userRole !== "admin") {
    redirect("/dashboard");
  }

  return <PendingContent user={session.user} />;
}
