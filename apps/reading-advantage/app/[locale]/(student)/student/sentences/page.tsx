import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import React from "react";
import TabsPractice from "@/components/tabs";

type Props = {};

export default async function SentencesPage({}: Props) {
  const user = await getCurrentUser();
  if (!user) {
    return redirect("/auth/signin");
  }
  if (user.cefr_level === "" && user.level === 0) {
    return redirect("/level");
  }
  return (
    <>
      <TabsPractice userId={user.id} />
    </>
  );
}
