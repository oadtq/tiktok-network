import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";

import { UsersContent } from "./_components/users-content";

export default async function UsersPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/signin");
  }

  // Check if user is admin
  const userRole = (session.user as { role?: string }).role ?? "creator";
  if (userRole !== "admin") {
    redirect("/dashboard");
  }

  return <UsersContent user={session.user} />;
}
