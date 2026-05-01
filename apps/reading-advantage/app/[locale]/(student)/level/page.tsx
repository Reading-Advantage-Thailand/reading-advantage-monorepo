import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import React from "react";
import LevelTestChat from "@/components/level-test-chat";
import { SessionSyncRedirect } from "@/components/session-sync-redirect";

export const metadata = {
  title: "Level grading",
};

export default async function LevelPage() {
  const user = await getCurrentUser();
  if (!user) {
    return redirect("/auth/signin");
  }

  // If user already has a level/xp (checked from FRESH DB data),
  // but they are here, it likely means their Client Session is stale.
  // We utilize SessionSyncRedirect to force a client-side session update and redirect them out.
  // FIX: Middleware checks BOTH level and xp. If level>0 but xp=0, Middleware forces /level.
  // So we must ONLY redirect if BOTH level and xp are present, implying full completion.
  // Otherwise, if xp is 0, we let them take the test (or at least see the chat).
  const isLevelTestCompleted =
    user.level && user.level > 0 && user.xp && user.xp > 0;

  if (isLevelTestCompleted) {
    return (
      <div className="container py-8">
        <SessionSyncRedirect />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <LevelTestChat userId={user.id} />
    </div>
  );
}
