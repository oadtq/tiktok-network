import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";

import { CloudPhonesContent } from "./_components/cloud-phones-content";

export default async function CloudPhonesPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/signin");
  }

  // Check if user is admin
  const userRole = (session.user as { role?: string }).role ?? "creator";
  if (userRole !== "admin") {
    redirect("/dashboard");
  }

  return <CloudPhonesContent user={session.user} />;
}
