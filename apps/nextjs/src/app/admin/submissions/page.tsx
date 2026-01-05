import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";

import { SubmissionsContent } from "./_components/submissions-content";

export default async function SubmissionsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/signin");
  }

  // Check if user is admin
  const userRole = (session.user as { role?: string }).role ?? "creator";
  if (userRole !== "admin") {
    redirect("/dashboard");
  }

  return <SubmissionsContent user={session.user} />;
}
