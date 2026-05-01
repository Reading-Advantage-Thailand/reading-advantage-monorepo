"use client";
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useScopedI18n } from "@/locales/client";
import dynamic from "next/dynamic";

type Props = {
  userId: string;
};

const FlashCard = dynamic(
  () =>
    import("@/components/flashcards").then((mod) => ({
      default: mod.FlashcardDashboard,
    })),
  {
    ssr: false,
  }
);
const OrderSentences = dynamic(
  () => import("@/components/practic/order-sentences-page")
);
const ClozeTestPage = dynamic(
  () => import("@/components/practic/cloze-test-page")
);
const OrderWords = dynamic(() => import("@/components/practic/order-words-page"));
const Matching = dynamic(() => import("@/components/matching"));
const ManageTab = dynamic(() => import("./manage-tab"));

export default function TabsPractice({ userId }: Props) {
  const [activeTab, setActiveTab] = useState("tab1");
  const [showButton, setShowButton] = useState(true);
  const t = useScopedI18n("pages.student.practicePage");

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <Tabs
      defaultValue="tab1"
      className="w-full"
      onValueChange={handleTabChange}
    >
      <TabsList className="h-fit grid grid-cols-1 md:grid-cols-6">
        <TabsTrigger value="tab1">{t("flashcard").toString()}</TabsTrigger>
        <TabsTrigger value="tab2">{t("orderSentences").toString()}</TabsTrigger>
        <TabsTrigger value="tab3">{t("clozeTest").toString()}</TabsTrigger>
        <TabsTrigger value="tab4">{t("orderWords").toString()}</TabsTrigger>
        <TabsTrigger value="tab5">{t("matching").toString()}</TabsTrigger>
        <TabsTrigger value="tab6">{t("manage").toString()}</TabsTrigger>
      </TabsList>

      <TabsContent className="space-y-2" value="tab1">
        {activeTab === "tab1" && (
          <FlashCard userId={userId} deckType="SENTENCE" />
        )}
      </TabsContent>
      <TabsContent className="space-y-2" value="tab2">
        {activeTab === "tab2" && <OrderSentences />}
      </TabsContent>
      <TabsContent className="space-y-2" value="tab3">
        {activeTab === "tab3" && <ClozeTestPage />}
      </TabsContent>
      <TabsContent className="space-y-2" value="tab4">
        {activeTab === "tab4" && <OrderWords />}
      </TabsContent>
      <TabsContent className="space-y-2" value="tab5">
        {activeTab === "tab5" && <Matching userId={userId} />}
      </TabsContent>
      <TabsContent className="space-y-2" value="tab6">
        {activeTab === "tab6" && <ManageTab userId={userId} />}
      </TabsContent>
    </Tabs>
  );
}
