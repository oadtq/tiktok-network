import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";

import { AdminStatisticsContent } from "../_components/admin-statistics-content";

export default async function AdminStatisticsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/signin");
  }

  // Check if user is admin
  const userRole = (session.user as { role?: string }).role ?? "creator";
  if (userRole !== "admin") {
    redirect("/dashboard");
  }

  return <AdminStatisticsContent user={session.user} />;
}
