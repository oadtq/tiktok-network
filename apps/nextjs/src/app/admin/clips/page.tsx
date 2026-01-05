import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";
import { AdminClipsContent } from "./_components/admin-clips-content";

export default async function AdminClipsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/signin");
  }

  // Check if user is admin
  const userRole = (session.user as { role?: string }).role ?? "creator";
  if (userRole !== "admin") {
    redirect("/dashboard");
  }

  return <AdminClipsContent user={session.user} />;
}
