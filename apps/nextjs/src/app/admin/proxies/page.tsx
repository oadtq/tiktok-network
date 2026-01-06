import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";
import { ProxiesContent } from "./_components/proxies-content";

export default async function ProxiesPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/signin");
  }

  const userRole = (session.user as { role?: string }).role ?? "creator";
  if (userRole !== "admin") {
    redirect("/dashboard");
  }

  return <ProxiesContent user={session.user} />;
}

