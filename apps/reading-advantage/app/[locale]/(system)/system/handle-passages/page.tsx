import React from "react";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import System from "@/components/system-articles";
import { fetchMoreArticles } from "@/lib/fetchMoreArticles";
import HandleArticle from "@/components/handle-article";

export default async function SystemPage() {
  const user = await getCurrentUser();
  if (!user) {
    return redirect("/auth/signin");
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Header heading="Handle Passages" />
      </div>
      <main>
        {/* <System fetchMoreData={fetchMoreArticles} /> */}
        <HandleArticle />
      </main>
    </div>
  );
}
