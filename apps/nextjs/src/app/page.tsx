import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/signin");
  }

  redirect("/dashboard");
}
