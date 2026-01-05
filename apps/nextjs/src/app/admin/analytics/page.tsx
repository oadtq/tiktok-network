import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";
import { AdminAnalyticsContent } from "../_components/admin-analytics-content";

export default async function AdminAnalyticsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/signin");
  }

  const userRole = (session.user as { role?: string }).role ?? "creator";
  if (userRole !== "admin") {
    redirect("/dashboard");
  }

  return <AdminAnalyticsContent user={session.user} />;
}
