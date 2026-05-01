// components/flashcards/empty-dashboard.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  Target,
  FileText,
  ArrowRight,
  CheckCircle,
  GraduationCap,
  Brain,
  Zap,
  Globe,
  Clock,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

interface EmptyDashboardProps {
  deckType?: "VOCABULARY" | "SENTENCE";
}

export function EmptyDashboard({ deckType }: EmptyDashboardProps) {
  const getContent = () => {
    if (deckType === "VOCABULARY") {
      return {
        icon: <GraduationCap className="h-16 w-16" />,
        title: "Start Your Vocabulary Journey",
        description:
          "Create personalized flashcard decks by reading articles and saving vocabulary words. Master new words with scientifically-proven spaced repetition.",
        actionText: "Start Reading for Vocabulary",
        gradient:
          "from-blue-50 to-indigo-100 dark:from-blue-950/20 dark:to-indigo-950/20",
        iconColor: "text-blue-500",
        badgeColor:
          "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        steps: [
          {
            icon: BookOpen,
            text: "Read Articles",
            desc: "Browse content at your reading level",
            color: "text-blue-500",
            bgColor: "bg-blue-50 dark:bg-blue-950/20",
          },
          {
            icon: Target,
            text: "Save Words",
            desc: "Click words to add to your deck",
            color: "text-green-500",
            bgColor: "bg-green-50 dark:bg-green-950/20",
          },
          {
            icon: CheckCircle,
            text: "Study & Master",
            desc: "Learn with spaced repetition",
            color: "text-purple-500",
            bgColor: "bg-purple-50 dark:bg-purple-950/20",
          },
        ],
      };
    } else if (deckType === "SENTENCE") {
      return {
        icon: <FileText className="h-16 w-16" />,
        title: "Start Your Sentence Mastery",
        description:
          "Build sentence comprehension by reading articles and saving meaningful sentences. Practice understanding and translation skills through interactive flashcards.",
        actionText: "Start Reading for Sentences",
        gradient:
          "from-green-50 to-emerald-100 dark:from-green-950/20 dark:to-emerald-950/20",
        iconColor: "text-green-500",
        badgeColor:
          "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        steps: [
          {
            icon: FileText,
            text: "Read Articles",
            desc: "Discover engaging content to learn from",
            color: "text-green-500",
            bgColor: "bg-green-50 dark:bg-green-950/20",
          },
          {
            icon: Target,
            text: "Save Sentences",
            desc: "Select meaningful sentences for practice",
            color: "text-blue-500",
            bgColor: "bg-blue-50 dark:bg-blue-950/20",
          },
          {
            icon: CheckCircle,
            text: "Practice Translation",
            desc: "Master sentence understanding",
            color: "text-purple-500",
            bgColor: "bg-purple-50 dark:bg-purple-950/20",
          },
        ],
      };
    } else {
      return {
        icon: <Brain className="h-16 w-16" />,
        title: "Start Your Learning Adventure",
        description:
          "Build personalized flashcard decks by reading articles and saving vocabulary words or sentences. Use scientifically-proven spaced repetition to learn efficiently and retain more.",
        actionText: "Start Reading Articles",
        gradient:
          "from-purple-50 to-pink-100 dark:from-purple-950/20 dark:to-pink-950/20",
        iconColor: "text-purple-500",
        badgeColor:
          "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
        steps: [
          {
            icon: BookOpen,
            text: "Read Content",
            desc: "Choose from curated articles at your level",
            color: "text-blue-500",
            bgColor: "bg-blue-50 dark:bg-blue-950/20",
          },
          {
            icon: Target,
            text: "Build Your Deck",
            desc: "Save words and sentences that matter",
            color: "text-green-500",
            bgColor: "bg-green-50 dark:bg-green-950/20",
          },
          {
            icon: CheckCircle,
            text: "Study & Progress",
            desc: "Master with spaced repetition",
            color: "text-purple-500",
            bgColor: "bg-purple-50 dark:bg-purple-950/20",
          },
        ],
      };
    }
  };

  const content = getContent();

  return (
    <div className="container mx-auto max-w-4xl space-y-8 px-4 py-12">
      {/* Hero Section with Header Component */}
      <div className="space-y-6">
        <Card
          className={`overflow-hidden bg-gradient-to-br ${content.gradient}`}
        >
          <CardContent className="p-12 text-center">
            <div className="space-y-8">
              <div className="relative">
                <div className="animate-pulse">
                  <div
                    className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white/80 shadow-lg dark:bg-gray-900/80 ${content.iconColor}`}
                  >
                    {content.icon}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Badge
                  variant="secondary"
                  className={`${content.badgeColor} px-4 py-2 text-sm font-semibold`}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {deckType ? `${deckType} DECK` : "FLASHCARD SYSTEM"}
                </Badge>

                <p className="text-muted-foreground text-lg">
                  Ready to start your learning journey?
                </p>
              </div>

              <Button
                asChild
                size="lg"
                className="mt-8 h-14 px-8 text-lg font-semibold"
              >
                <Link href="/student/read">
                  <BookOpen className="mr-2 h-5 w-5" />
                  {content.actionText}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <div className="space-y-8">
        <div className="space-y-3 text-center">
          <h2 className="text-2xl font-bold">How It Works</h2>
          <p className="text-muted-foreground text-lg">
            Get started in three simple steps and begin your learning journey
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {content.steps.map((step, index) => (
            <Card
              key={index}
              className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg"
            >
              <div className={`absolute inset-0 ${step.bgColor} opacity-50`} />
              <CardHeader className="relative pb-4 text-center">
                <div
                  className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${step.bgColor} shadow-md ${step.color}`}
                >
                  <step.icon className="h-8 w-8" />
                </div>
                <Badge variant="outline" className="mx-auto mb-3 border-2">
                  Step {index + 1}
                </Badge>
                <CardTitle className="text-xl font-semibold">
                  {step.text}
                </CardTitle>
              </CardHeader>
              <CardContent className="relative pt-0 text-center">
                <p className="text-muted-foreground">{step.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <Card>
        <CardContent className="p-10">
          <div className="space-y-8 text-center">
            <div className="space-y-3">
              <h3 className="text-2xl font-bold">Why This Approach Works</h3>
              <p className="text-muted-foreground">
                Built on scientific learning principles for maximum retention
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              {[
                {
                  icon: Brain,
                  title: "Spaced Repetition",
                  desc: "Scientifically proven method",
                  color: "text-purple-500",
                },
                {
                  icon: Target,
                  title: "Personalized",
                  desc: "Content tailored to you",
                  color: "text-blue-500",
                },
                {
                  icon: Zap,
                  title: "Track Progress",
                  desc: "Monitor improvement",
                  color: "text-green-500",
                },
                {
                  icon: Globe,
                  title: "Multi-Language",
                  desc: "Learn any language",
                  color: "text-orange-500",
                },
              ].map((feature, index) => (
                <div key={index} className="group space-y-4 text-center">
                  <div
                    className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 ${feature.color} transition-transform duration-200 group-hover:scale-110`}
                  >
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-semibold">{feature.title}</div>
                    <p className="text-muted-foreground text-sm">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Final CTA */}
      <div className="space-y-6 text-center">
        <div className="space-y-3">
          <h3 className="text-2xl font-bold">Ready to Start Learning?</h3>
          <p className="text-muted-foreground text-lg">
            Join thousands of learners improving their language skills every day
          </p>
        </div>

        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Button asChild size="lg" className="h-12 px-8">
            <Link href="/student/read">
              <BookOpen className="mr-2 h-4 w-4" />
              Start Reading Now
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 px-8">
            <Link href="/student/read">
              <Clock className="mr-2 h-4 w-4" />
              Browse Articles
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
