import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import React from "react";
import { getScopedI18n } from "@/locales/server";
import { fetchData } from "@/utils/fetch-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import ChapterList from "@/components/stories-chapter-list";
import StoriesAssignDialog from "@/components/teacher/stories-assign-dialog";
import StoriesActions from "@/components/stories-actions";
import { CardDescription } from "@/components/ui/card";
import { StoriesSummary } from "@/components/stories-summary";
import ExportStoryWorkbooksButton from "@/components/teacher/export-story-workbooks-button";
import { BookOpen, Users } from "lucide-react";
import { log } from "console";

export interface StoryBible {
  mainPlot: {
    premise: string;
    exposition: string;
    risingAction: string;
    climax: string;
    fallingAction: string;
    resolution: string;
  };
  characters: Character[];
  setting: Setting;
  themes: Theme[];
  summary: string;
  "image-description": string;
}

interface Character {
  name: string;
  description: string;
  background: string;
  speechPatterns: string;
  arc: {
    startingState: string;
    development: string;
    endState: string;
  };
  relationships: Relationship[];
}

interface Relationship {
  withCharacter: string;
  nature: string;
  evolution: string;
}

interface Setting {
  time: string;
  places: Place[];
  worldRules: string[];
}

interface Place {
  name: string;
  description: string;
  significance: string;
}

interface Theme {
  theme: string;
  development: string;
}

async function getStory(storyId: string) {
  const data = await fetchData(`/api/v1/stories/${storyId}`);
  return data.result;
}

export default async function StoryChapterSelectionPage({
  params,
}: {
  params: Promise<{ locale: string; storyId: string }>;
}) {
  const { storyId, locale } = await params;
  const t = await getScopedI18n("components.articleCard");
  const user = await getCurrentUser();
  if (!user) return redirect("/auth/signin");

  const translations = {
    chapters: t("chapters"),
    characters: t("characters"),
    previouslyRead: t("previouslyRead"),
    started: t("started"),
    completed: t("completed"),
    continueRead: t("continueRead"),
    readChapter: t("readChapter"),
  };

  const isAtLeastTeacher = (role: string) =>
    role.includes("TEACHER") ||
    role.includes("ADMIN") ||
    role.includes("SYSTEM");

  const isAboveTeacher = (role: string) =>
    role.includes("ADMIN") || role.includes("SYSTEM");

  const storyResponse = await getStory(storyId);

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Hero Section with Image */}
      <div className="relative w-full h-[400px] md:h-[500px] rounded-2xl overflow-hidden mb-8 shadow-2xl">
        <Image
          src={`https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/images/${storyResponse.id}.png`}
          alt={storyResponse.title}
          fill
          className="object-cover"
          priority
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 text-white">
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30">
              {t("raLevel", {
                raLevel: storyResponse.raLevel,
              })}
            </Badge>
            <Badge className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30">
              {t("cefrLevel", {
                cefrLevel: storyResponse.cefrLevel,
              })}{" "}
            </Badge>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-3 drop-shadow-lg">
            {storyResponse.title}
          </h1>
        </div>
      </div>

      {/* Main Content Card */}
      <Card className="shadow-lg border-2">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <CardDescription className="text-base">
                <StoriesSummary
                  story={storyResponse}
                  storyId={storyResponse.id}
                />
              </CardDescription>
            </div>

            {isAtLeastTeacher(user.role) && (
              <div className="flex flex-wrap gap-2">
                <StoriesAssignDialog
                  story={storyResponse}
                  storyId={storyId}
                  userId={user.id}
                />
                {isAboveTeacher(user.role) && (
                  <ExportStoryWorkbooksButton
                    chapters={storyResponse.chapters}
                    storyTitle={storyResponse.title}
                  />
                )}
                <StoriesActions story={storyResponse} storyId={storyId} />
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="chapters" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="chapters" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span>Chapters</span>
              </TabsTrigger>
              <TabsTrigger
                value="characters"
                className="flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                <span>Characters</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chapters" className="mt-0">
              <ChapterList
                locale={locale}
                storyId={storyResponse.id}
                chapters={storyResponse.chapters}
                translations={translations}
              />
            </TabsContent>

            <TabsContent value="characters" className="mt-0">
              <div className="grid gap-4 md:grid-cols-2">
                {storyResponse.storyBible.characters.map(
                  (char: any, index: number) => (
                    <Card
                      key={index}
                      className="hover:shadow-md transition-shadow"
                    >
                      <CardHeader>
                        <CardTitle className="text-lg">{char.name}</CardTitle>
                        <CardDescription>{char.description}</CardDescription>
                      </CardHeader>
                      {char.background && (
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            <span className="font-semibold">Background:</span>{" "}
                            {char.background}
                          </p>
                        </CardContent>
                      )}
                    </Card>
                  )
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
