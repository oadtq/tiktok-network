import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";
import { ClipDetailsContent } from "../_components/clip-details-content";

export default async function ClipDetailsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/auth/signin");
  }

  const { id } = await props.params;
  return <ClipDetailsContent user={session.user} clipId={id} />;
}

