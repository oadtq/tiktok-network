import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";
import { TikTokAccountsContent } from "./_components/tiktok-accounts-content";

export default async function TikTokAccountsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/signin");
  }

  return <TikTokAccountsContent user={session.user} />;
}
