import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";
import { AdminDashboardContent } from "./_components/admin-dashboard-content";

export default async function AdminPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/signin");
  }

  // Check if user is admin
  const userRole = (session.user as { role?: string }).role ?? "creator";
  if (userRole !== "admin") {
    redirect("/dashboard");
  }

  return <AdminDashboardContent user={session.user} />;
}
