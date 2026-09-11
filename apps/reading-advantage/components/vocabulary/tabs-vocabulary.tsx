"use client";
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useScopedI18n } from "@/locales/client";
import dynamic from "next/dynamic";
import {
  fetchVocabularyMatchingWords,
} from "@/components/matching";
import {
  ActivityType,
  UserXpEarned,
} from "../models/user-activity-log-model";

type Props = {
  userId: string;
};

const FlashCard = dynamic(() => import("../flashcards").then(mod => ({ default: mod.FlashcardDashboard })));
const MatchingWords = dynamic(() => import("@/components/matching"));
const VocabularyManageTab = dynamic(() => import("./tab-manage"));

export default function TabsVocabulary({ userId }: Props) {
  const [activeTab, setActiveTab] = useState("tab1");
  const [showButton, setShowButton] = useState(true);
  const t = useScopedI18n("components.wordList.tab");
  const tWordList = useScopedI18n("components.wordList");

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
        <TabsTrigger value="tab5">{t("matching").toString()}</TabsTrigger>
        <TabsTrigger value="tab6">{t("manage").toString()}</TabsTrigger>
      </TabsList>
      <TabsContent className="space-y-2" value="tab1">
        {activeTab === "tab1" && <FlashCard userId={userId} deckType="VOCABULARY" />}
      </TabsContent>

      <TabsContent className="space-y-2" value="tab5">
        {activeTab === "tab5" && (
          <MatchingWords
            userId={userId}
            fetchWords={fetchVocabularyMatchingWords}
            description={tWordList("matching.description")}
            headerClassName="mt-5"
            activityType={ActivityType.VocabularyMatching}
            xpEarned={UserXpEarned.Vocabulary_Matching}
            showAudio={false}
          />
        )}
      </TabsContent>
      <TabsContent className="space-y-2" value="tab6">
        {activeTab === "tab6" && <VocabularyManageTab userId={userId} />}
      </TabsContent>
    </Tabs>
  );
}
