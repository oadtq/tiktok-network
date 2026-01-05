import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";
import { ClipEditContent } from "../../_components/clip-edit-content";

export default async function ClipEditPage(props: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/auth/signin");
  }

  const { id } = await props.params;
  return <ClipEditContent user={session.user} clipId={id} />;
}

