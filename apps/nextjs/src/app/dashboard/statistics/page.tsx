import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";

import { StatisticsContent } from "../_components/statistics-content";

export default async function StatisticsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/signin");
  }

  return <StatisticsContent user={session.user} />;
}

