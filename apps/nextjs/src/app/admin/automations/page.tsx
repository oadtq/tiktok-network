import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";
import { AutomationsContent } from "./_components/automations-content";

export default async function AutomationsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/signin");
  }

  const userRole = (session.user as { role?: string }).role ?? "creator";
  if (userRole !== "admin") {
    redirect("/dashboard");
  }

  return <AutomationsContent user={session.user} />;
}
