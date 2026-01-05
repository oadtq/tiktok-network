import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";

import { ClipsContent } from "./_components/clips-content";

export default async function ClipsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/signin");
  }

  return <ClipsContent user={session.user} />;
}
