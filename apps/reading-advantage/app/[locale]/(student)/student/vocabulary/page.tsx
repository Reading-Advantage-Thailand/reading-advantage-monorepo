import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import React from "react";
import TabsVocabulary from "@/components/vocabulary/tabs-vocabulary";

type Props = {};

export default async function VocabularyPage({}: Props) {
  const user = await getCurrentUser();
  if (!user) {
    return redirect("/auth/signin");
  }
  if (user.cefr_level === "" && user.level === 0) {
    return redirect("/level");
  }
  return (
    <>
      <TabsVocabulary userId={user.id} />
    </>
  );
}
