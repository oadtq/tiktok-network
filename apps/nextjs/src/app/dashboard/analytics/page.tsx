import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";
import { AnalyticsContent } from "../_components/analytics-content";

export default async function AnalyticsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/signin");
  }

  return <AnalyticsContent user={session.user} />;
}
