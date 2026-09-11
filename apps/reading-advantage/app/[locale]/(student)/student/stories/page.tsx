import { Header } from "@/components/header";
import { getCurrentUser } from "@/lib/session";
import { getScopedI18n } from "@/locales/server";
import { redirect } from "next/navigation";
import React from "react";
import SelectStory from "@/components/stories-select";

export default async function StoriesPage() {
  const user = await getCurrentUser();
  if (!user) return redirect("/auth/signin");

  const t = await getScopedI18n("pages.student.storyPage");
  return (
    <>
      <Header heading={t("storySelection")} />
      <SelectStory
        user={{
          level: user.level ?? 0,
          name: user?.display_name,
          id: user?.id,
          role: user?.role,
        }}
      />
    </>
  );
}
