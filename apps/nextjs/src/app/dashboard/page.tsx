import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";
import { DashboardContent } from "./_components/dashboard-content";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/signin");
  }

  return <DashboardContent user={session.user} />;
}
