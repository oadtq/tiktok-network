import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";

import { UploadContent } from "./_components/upload-content";

export default async function UploadPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/signin");
  }

  return <UploadContent user={session.user} />;
}
