"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  Sparkles,
  Loader2,
  RefreshCw,
  Save,
  AlertTriangle,
  Trash,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import Genres from "@/data/genres.json";
import { getDeleteArticleById } from "@/actions/article";
import { useTranslations } from "next-intl";

interface StatusConfig {
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface StatusConfigMap {
  draft: StatusConfig;
  pending: StatusConfig;
  approved: StatusConfig;
  rejected: StatusConfig;
}

type ArticleStatus = keyof StatusConfigMap;

interface UserArticle {
  id: string;
  title: string;
  type: string;
  genre: string;
  subGenre: string;
  cefrLevel: string;
  isDraft: boolean;
  isPublished: boolean;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: string;
  wordCount: number;
  raLevel: number;
  rating: number;
  passage: string;
  summary: string;
  imageDesc: string;
  topic: string;
}

export default function AdminArticleCreation() {
  const [articleType, setArticleType] = useState("");
  const [genre, setGenre] = useState("");
  const [subGenre, setSubGenre] = useState("");
  const [topic, setTopic] = useState("");
  const [cefrLevel, setCefrLevel] = useState("");
  const [wordCount, setWordCount] = useState(500);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTab, setCurrentTab] = useState("create");
  const [genres, setGenres] = useState<{
    fiction: Array<{
      name: string;
      subgenres: string[];
    }>;
    nonfiction: Array<{
      name: string;
      subgenres: string[];
    }>;
  }>(Genres);
  const [error, setError] = useState<string | null>(null);
  const [generatedData, setGeneratedData] = useState<{
    title: string;
    passage: string;
    summary: string;
    imageDesc: string;
  } | null>(null);
  const [userArticles, setUserArticles] = useState<UserArticle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState("");
  const [showLoadingDialog, setShowLoadingDialog] = useState(false);
  const [loadingType, setLoadingType] = useState<
    "generate" | "save" | "approve"
  >("generate");
  const [selectedArticleForEdit, setSelectedArticleForEdit] =
    useState<UserArticle | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [pendingApprovalId, setPendingApprovalId] = useState<string | null>(
    null,
  );
  const [originalContent, setOriginalContent] = useState<{
    title: string;
    passage: string;
    summary: string;
    imageDesc: string;
  } | null>(null);
  const [showBackToCreateDialog, setShowBackToCreateDialog] = useState(false);
  const [hasContentChanged, setHasContentChanged] = useState(false);
  const [saveData, setSaveData] = useState({});
  const [deletingArticleId, setDeletingArticleId] = useState<string | null>(
    null,
  );
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [isDataChanged, setIsDataChanged] = useState<boolean>(false);
  const tc = useTranslations("Components");

  const getLoadingTitle = () => {
    switch (loadingType) {
      case "generate":
        return tc("AdminArticleCreation.loading.titles.generate");
      case "save":
        return tc("AdminArticleCreation.loading.titles.save");
      case "approve":
        return tc("AdminArticleCreation.loading.titles.approve");
      default:
        return tc("waitingButton");
    }
  };

  const getLoadingDescription = () => {
    switch (loadingType) {
      case "generate":
        return tc("AdminArticleCreation.loading.descriptions.generate");
      case "save":
        return tc("AdminArticleCreation.loading.descriptions.save");
      case "approve":
        return tc("AdminArticleCreation.loading.descriptions.approve");
      default:
        return tc("waitingButton");
    }
  };

  const getLoadingIcon = () => {
    switch (loadingType) {
      case "generate":
        return <Sparkles className="h-5 w-5 animate-pulse text-blue-500" />;
      case "save":
        return <Save className="h-5 w-5 animate-pulse text-green-500" />;
      case "approve":
        return (
          <CheckCircle2 className="h-5 w-5 animate-pulse text-purple-500" />
        );
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    }
  };

  useEffect(() => {
    if (currentTab === "manage") {
      fetchUserArticles();
    }
  }, [currentTab]);

  const fetchUserArticles = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/articles/generate/custom-generate");
      if (!response.ok) {
        throw new Error("Failed to fetch articles");
      }
      const data = await response.json();

      setUserArticles(data.articles || []);
    } catch (error) {
      console.error("Error fetching user articles:", error);
      toast.error(tc("AdminArticleCreation.toasts.fetchFailed"), {
        richColors: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const confirmApproval = async () => {
    // if (!pendingApprovalId) return;

    try {
      setLoadingType("approve");
      setIsGenerating(true);
      setShowApprovalDialog(false);

      let article = {};
      if (!pendingApprovalId) {
        article = {
          ...generatedData,
          type: articleType,
          genre,
          subGenre,
        };
      } else {
        article = {
          id: pendingApprovalId,
        };
      }

      const response = await fetch(
        "/api/articles/generate/custom-generate/approve",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ article }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to approve article");
      }

      // Complete the progress
      setLoadingProgress(100);
      setCurrentMessage(tc("AdminArticleCreation.toasts.approveSuccess"));

      // Small delay to show completion
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success(tc("AdminArticleCreation.toasts.approveSuccess"));
    } catch (error) {
      console.error("Error approving article:", error);
      toast.error(tc("AdminArticleCreation.toasts.approveFailed"));
    } finally {
      // Force reset all states immediately
      setIsGenerating(false);
      setIsApproving(null);
      setPendingApprovalId(null);
      setLoadingProgress(0);
      setCurrentMessage("");
      setShowLoadingDialog(false);
      document.body.style.pointerEvents = "auto";
      if (currentTab === "manage") {
        fetchUserArticles();
      } else {
        setCurrentTab("manage");
        fetchUserArticles();
        clearAllInput();
      }
    }
  };

  const cancelApproval = () => {
    setShowApprovalDialog(false);
    setPendingApprovalId(null);
  };

  const clearAllInput = () => {
    setArticleType("");
    setGenre("");
    setSubGenre("");
    setTopic("");
    setCefrLevel("");
    setGeneratedData(null);
    setOriginalContent(null);
    setSaveData({});
    setSelectedArticleForEdit(null);
    setIsPreviewMode(false);
    setShowApprovalDialog(false);
    setIsDataChanged(false);
    setIsEditMode(false);
  };

  const handleGenerate = async () => {
    if (!articleType || !genre || !topic || !cefrLevel) {
      return;
    }

    setLoadingType("generate");
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/articles/generate/custom-generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: articleType,
          genre,
          subgenre: subGenre,
          topic,
          cefrLevel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to generate article");
      }

      const { data } = await response.json();

      setLoadingProgress(100);
      setCurrentMessage(tc("AdminArticleCreation.toasts.generateSuccess"));

      await new Promise((resolve) => setTimeout(resolve, 1000));

      setOriginalContent(data);
      setGeneratedData(data);
      setSaveData(data);
      setCurrentTab("preview");
      setIsEditMode(true);

      toast.success(tc("AdminArticleCreation.toasts.generateSuccess"), {
        richColors: true,
      });
    } catch (error) {
      console.error("Error generating article:", error);
      setError(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
    } finally {
      // Force reset loading states immediately
      setIsGenerating(false);
      setLoadingProgress(0);
      setCurrentMessage("");
      setShowLoadingDialog(false);
      document.body.style.pointerEvents = "auto";
    }
  };

  const handlePreviewArticle = (article: UserArticle) => {
    setSelectedArticleForEdit(article);
    setIsPreviewMode(true);
    const articleData = {
      title: article.title,
      passage: article.passage,
      summary: article.summary,
      imageDesc: article.imageDesc,
    };
    setGeneratedData(articleData);
    // เซ็ต original content
    setOriginalContent(articleData);
    setCurrentTab("preview");
  };

  const handleEditArticle = (article: UserArticle) => {
    setSelectedArticleForEdit(article);
    setIsEditMode(true);
    const articleData = {
      title: article.title,
      passage: article.passage,
      summary: article.summary,
      imageDesc: article.imageDesc,
    };
    setGeneratedData(articleData);
    setOriginalContent(articleData);
    setCurrentTab("preview");
  };

  const handleSaveArticle = async () => {
    if (!generatedData) return;
    try {
      setLoadingType("save");
      setIsGenerating(true);

      const response = await fetch(
        `/api/articles/generate/custom-generate/save`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            article: generatedData,
            type: articleType,
            genre,
            subgenre: subGenre,
            topic,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to save article");
      }

      // Complete the progress
      setLoadingProgress(100);
      setCurrentMessage(tc("AdminArticleCreation.toasts.saveSuccess"));

      // Small delay to show completion
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success(tc("AdminArticleCreation.toasts.saveSuccess"));

      // Refresh the articles list
      // await fetchUserArticles();

      // Update local state และ original content
      setSelectedArticleForEdit((prev) =>
        prev
          ? { ...prev, ...generatedData, updatedAt: new Date().toISOString() }
          : null,
      );
      setOriginalContent(generatedData);
    } catch (error) {
      console.error("Error saving article:", error);
      toast.error(tc("AdminArticleCreation.toasts.saveFailed"));
    } finally {
      // Force reset loading states immediately
      setIsGenerating(false);
      setLoadingProgress(0);
      setCurrentMessage("");
      setShowLoadingDialog(false);
      setCurrentTab("manage");
      fetchUserArticles();
      clearAllInput();
      document.body.style.pointerEvents = "auto";
    }
  };

  const handleApproveAndPublishButton = async () => {
    if (!selectedArticleForEdit || !generatedData) return;

    try {
      setLoadingType("approve");
      setIsGenerating(true);

      let article = {};

      if (currentTab === "preview") {
        article = {
          ...generatedData,
          type: articleType,
          genre,
          subGenre,
        };
      } else {
        article = {
          id: pendingApprovalId,
        };
      }

      // First update the article with new data
      const Response = await fetch(
        `/api/articles/generate/custom-generate/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            article,
          }),
        },
      );

      if (!Response.ok) {
        const errorData = await Response.json();
        throw new Error(errorData.details || "Failed to update article");
      }

      // Complete the progress
      setLoadingProgress(100);
      setCurrentMessage(tc("AdminArticleCreation.toasts.approveSuccess"));

      // Small delay to show completion
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success(tc("AdminArticleCreation.toasts.approveSuccess"));

      // Go back to manage tab
      if (currentTab === "preview") {
        setCurrentTab("manage");
      }
    } catch (error) {
      console.error("Error approving article:", error);
      toast.error(tc("AdminArticleCreation.toasts.approveFailed"));
    } finally {
      // Force reset all states immediately
      setIsGenerating(false);
      setLoadingProgress(0);
      setCurrentMessage("");
      setShowLoadingDialog(false);
      setSelectedArticleForEdit(null);
      setGeneratedData(null);
      setOriginalContent(null);
      setHasContentChanged(false);
      document.body.style.pointerEvents = "auto";
    }
  };

  const handleBackToCreate = () => {
    setCurrentTab("create");
    setIsEditMode(false);
    clearAllInput();
  };

  const currentGenres = articleType
    ? genres[articleType as keyof typeof genres] || []
    : [];

  const currentSubgenres = genre
    ? currentGenres.find((g) => g.name === genre)?.subgenres || []
    : [];

  const handleDeleteArticle = async (articleId: string) => {
    setDeletingArticleId(articleId);
    try {
      const result = await getDeleteArticleById(articleId);
      if (result.success) {
        toast.success(tc("AdminArticleCreation.toasts.deleteSuccess"), {
          richColors: true,
        });
        setUserArticles(userArticles.filter((a) => a.id !== articleId));
      } else {
        toast.error(tc("AdminArticleCreation.toasts.deleteFailed"), {
          richColors: true,
        });
      }
    } catch (error) {
      toast.error(tc("AdminArticleCreation.toasts.deleteError"), {
        richColors: true,
      });
    } finally {
      setDeletingArticleId(null);
    }
  };

  return (
    <div className="mx-auto w-full space-y-6 px-4 sm:px-6">
      {/* Approval Confirmation Dialog */}
      <AlertDialog
        open={showApprovalDialog}
        onOpenChange={setShowApprovalDialog}
      >
        <AlertDialogContent className="max-w-sm sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-sm sm:text-base">
              <AlertTriangle className="h-4 w-4 text-green-500 sm:h-5 sm:w-5" />
              {tc("AdminArticleCreation.dialog.approval.title")}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-sm">
              {tc("AdminArticleCreation.dialog.approval.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelApproval}>
              {tc("AdminArticleCreation.dialog.common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "accept" })}
              onClick={confirmApproval}
            >
              {tc("AdminArticleCreation.dialog.common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approve & Publish Confirmation Dialog */}
      <AlertDialog
        open={showBackToCreateDialog}
        onOpenChange={setShowBackToCreateDialog}
      >
        <AlertDialogContent className="max-w-sm sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-sm sm:text-base">
              <CheckCircle2 className="h-4 w-4 text-green-500 sm:h-5 sm:w-5" />
              {tc("AdminArticleCreation.dialog.backToCreate.title")}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-sm">
              {tc("AdminArticleCreation.dialog.backToCreate.description")}
              <div className="rounded-md border border-orange-200 bg-orange-50 p-3">
                <p className="text-sm font-medium text-orange-800">
                  {tc("AdminArticleCreation.dialog.backToCreate.warning")}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">
              {tc("AdminArticleCreation.dialog.common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBackToCreate}
              className="w-full bg-orange-600 hover:bg-orange-700 sm:w-auto"
            >
              {tc("AdminArticleCreation.dialog.common.ok")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Loading Dialog */}
      <Dialog open={showLoadingDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 text-center text-sm sm:text-base">
              {getLoadingIcon()}
              {getLoadingTitle()}
            </DialogTitle>
            <DialogDescription className="text-center text-sm">
              {getLoadingDescription()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Animated AI Icon */}
            <div className="flex justify-center">
              <div className="relative">
                <Loader2
                  className={`h-12 w-12 animate-spin sm:h-16 sm:w-16 ${
                    loadingType === "generate"
                      ? "text-blue-500"
                      : loadingType === "save"
                        ? "text-green-500"
                        : "text-purple-500"
                  }`}
                />
                <div
                  className={`absolute inset-0 animate-pulse rounded-full opacity-30 ${
                    loadingType === "generate"
                      ? "bg-blue-100"
                      : loadingType === "save"
                        ? "bg-green-100"
                        : "bg-purple-100"
                  }`}
                ></div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs sm:text-sm">
                {/* <span className="text-gray-600">{t("progress")}</span> */}
                <span
                  className={`font-medium ${
                    loadingType === "generate"
                      ? "text-blue-600"
                      : loadingType === "save"
                        ? "text-green-600"
                        : "text-purple-600"
                  }`}
                >
                  {Math.round(loadingProgress)}%
                </span>
              </div>
              <Progress value={loadingProgress} className="h-2" />
            </div>

            {/* Current Message */}
            <div className="text-center">
              <p className="min-h-[20px] animate-pulse text-xs text-gray-700 sm:text-sm">
                {currentMessage}
              </p>
            </div>

            {/* Animated Dots */}
            <div className="flex justify-center space-x-1">
              <div
                className={`h-2 w-2 animate-bounce rounded-full ${
                  loadingType === "generate"
                    ? "bg-blue-400"
                    : loadingType === "save"
                      ? "bg-green-400"
                      : "bg-purple-400"
                }`}
              ></div>
              <div
                className={`h-2 w-2 animate-bounce rounded-full ${
                  loadingType === "generate"
                    ? "bg-blue-400"
                    : loadingType === "save"
                      ? "bg-green-400"
                      : "bg-purple-400"
                }`}
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className={`h-2 w-2 animate-bounce rounded-full ${
                  loadingType === "generate"
                    ? "bg-blue-400"
                    : loadingType === "save"
                      ? "bg-green-400"
                      : "bg-purple-400"
                }`}
                style={{ animationDelay: "0.2s" }}
              ></div>
            </div>

            {/* Fun Stats */}
            <div className="grid grid-cols-3 gap-2 border-t pt-2 text-center text-xs text-gray-500 sm:gap-4">
              <div>
                {/* <div className="font-medium text-gray-700">{t("type")}</div> */}
                <div className="capitalize">
                  {selectedArticleForEdit?.type || articleType}
                </div>
              </div>
              <div>
                {/* <div className="font-medium text-gray-700">{t("level")}</div> */}
                <div>{selectedArticleForEdit?.cefrLevel || cefrLevel}</div>
              </div>
              <div>
                {/* <div className="font-medium text-gray-700">{t("words")}</div> */}
                <div>~{selectedArticleForEdit?.wordCount || wordCount}</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 text-xs sm:text-sm">
          <TabsTrigger value="create">
            {tc("AdminArticleCreation.tabs.createArticle")}
          </TabsTrigger>
          <TabsTrigger value="preview" disabled={!generatedData}>
            {tc("AdminArticleCreation.tabs.previewEdit")}
          </TabsTrigger>
          <TabsTrigger value="manage">
            {tc("AdminArticleCreation.tabs.manageArticles")}
          </TabsTrigger>
        </TabsList>

        {/* Create Article Tab */}
        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Sparkles className="h-4 w-4 text-blue-500 sm:h-5 sm:w-5" />
                {tc("AdminArticleCreation.aiArticleGenerator")}
              </CardTitle>
              <CardDescription className="text-sm">
                {tc("AdminArticleCreation.aiArticleGeneratorDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="type" className="text-sm sm:text-base">
                      {tc("AdminArticleCreation.articleType")}
                    </Label>
                    <RadioGroup
                      value={articleType}
                      onValueChange={(value) => {
                        setArticleType(value);
                        setGenre("");
                        setSubGenre("");
                      }}
                      className="mt-2 flex flex-col gap-4 sm:flex-row sm:gap-8"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="fiction" id="fiction" />
                        <Label
                          htmlFor="fiction"
                          className="text-sm sm:text-base"
                        >
                          {tc("AdminArticleCreation.fiction")}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="nonfiction" id="nonfiction" />
                        <Label
                          htmlFor="nonfiction"
                          className="text-sm sm:text-base"
                        >
                          {tc("AdminArticleCreation.nonFiction")}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <Label htmlFor="genre" className="text-sm sm:text-base">
                      {tc("AdminArticleCreation.genre")}
                    </Label>
                    <Select
                      value={genre}
                      onValueChange={(value) => {
                        setGenre(value);
                        setSubGenre("");
                      }}
                      disabled={!articleType}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue
                          placeholder={tc(
                            "AdminArticleCreation.placeholder.genre",
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {currentGenres.map((g) => (
                          <SelectItem
                            key={g.name}
                            value={g.name}
                            className="text-sm"
                          >
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="subgenre" className="text-sm sm:text-base">
                      {tc("AdminArticleCreation.subgenre")}
                    </Label>
                    <Select
                      value={subGenre}
                      onValueChange={setSubGenre}
                      disabled={!genre}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue
                          placeholder={tc(
                            "AdminArticleCreation.placeholder.subgenre",
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {currentSubgenres.map((sg) => (
                          <SelectItem key={sg} value={sg} className="text-sm">
                            {sg}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="cefr" className="text-sm sm:text-base">
                      {tc("AdminArticleCreation.cefrLevel")}
                    </Label>
                    <Select value={cefrLevel} onValueChange={setCefrLevel}>
                      <SelectTrigger className="text-sm">
                        <SelectValue
                          placeholder={tc(
                            "AdminArticleCreation.placeholder.cefr",
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A1" className="text-sm">
                          {tc("AdminArticleCreation.cefrLevels.A1")}
                        </SelectItem>
                        <SelectItem value="A2" className="text-sm">
                          {tc("AdminArticleCreation.cefrLevels.A2")}
                        </SelectItem>
                        <SelectItem value="B1" className="text-sm">
                          {tc("AdminArticleCreation.cefrLevels.B1")}
                        </SelectItem>
                        <SelectItem value="B2" className="text-sm">
                          {tc("AdminArticleCreation.cefrLevels.B2")}
                        </SelectItem>
                        <SelectItem value="C1" className="text-sm">
                          {tc("AdminArticleCreation.cefrLevels.C1")}
                        </SelectItem>
                        <SelectItem value="C2" className="text-sm">
                          {tc("AdminArticleCreation.cefrLevels.C2")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="topic" className="text-sm sm:text-base">
                  {tc("AdminArticleCreation.articleTopic")}
                </Label>
                <Textarea
                  placeholder={tc("AdminArticleCreation.placeholder.topic")}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  rows={3}
                  className="mt-2 text-sm"
                />
              </div>

              {error && (
                <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
                  {tc("AdminArticleCreation.error")}: {error}
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={
                  !articleType || !genre || !topic || !cefrLevel || isGenerating
                }
                className="w-full text-sm sm:text-base"
                size="lg"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {tc("AdminArticleCreation.generateWithAI")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview & Edit Tab */}
        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Eye className="h-4 w-4 text-green-500 sm:h-5 sm:w-5" />
                {isPreviewMode
                  ? tc("AdminArticleCreation.preview.title")
                  : tc("AdminArticleCreation.editor.title")}
                {/* เพิ่ม indicator สำหรับการเปลี่ยนแปลง */}
                {hasContentChanged && !isPreviewMode && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    <Edit3 className="mr-1 h-3 w-3" />
                    {tc("AdminArticleCreation.modified")}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-sm">
                {isPreviewMode
                  ? tc("AdminArticleCreation.preview.description")
                  : tc("AdminArticleCreation.editor.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="mb-4 flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">
                    {tc("AdminArticleCreation.badges.type")}: {articleType}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {tc("AdminArticleCreation.badges.genre")}: {genre}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {tc("AdminArticleCreation.badges.subgenre")}: {subGenre}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {tc("AdminArticleCreation.badges.cefrLevel")}:{" "}
                    {selectedArticleForEdit?.cefrLevel || cefrLevel}
                  </Badge>
                  {isPreviewMode && (
                    <Badge variant="secondary" className="text-xs">
                      {/* {t("previewMode")} */}
                    </Badge>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="article-title"
                      className="text-sm font-medium sm:text-base"
                    >
                      {tc("AdminArticleCreation.fields.title")}
                    </Label>
                    <Input
                      id="article-title"
                      value={generatedData?.title || ""}
                      onChange={(e) =>
                        !isPreviewMode &&
                        setGeneratedData((prev) =>
                          prev ? { ...prev, title: e.target.value } : null,
                        )
                      }
                      placeholder={tc(
                        "AdminArticleCreation.placeholders.title",
                      )}
                      className={`text-sm font-semibold sm:text-lg ${
                        isPreviewMode ? "text-gray-400" : ""
                      }`}
                      readOnly={isPreviewMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="article-content"
                      className="text-sm font-medium sm:text-base"
                    >
                      {tc("AdminArticleCreation.fields.content")}
                    </Label>
                    <Textarea
                      id="article-content"
                      value={generatedData?.passage || ""}
                      onChange={(e) =>
                        !isPreviewMode &&
                        setGeneratedData((prev) =>
                          prev ? { ...prev, passage: e.target.value } : null,
                        )
                      }
                      placeholder={tc(
                        "AdminArticleCreation.placeholders.content",
                      )}
                      rows={12}
                      className={`text-sm leading-relaxed ${
                        isPreviewMode ? "text-gray-400" : ""
                      }`}
                      readOnly={isPreviewMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="article-summary"
                      className="text-sm font-medium sm:text-base"
                    >
                      {tc("AdminArticleCreation.fields.summary")}
                    </Label>
                    <Textarea
                      id="article-summary"
                      value={generatedData?.summary || ""}
                      onChange={(e) =>
                        !isPreviewMode &&
                        setGeneratedData((prev) =>
                          prev ? { ...prev, summary: e.target.value } : null,
                        )
                      }
                      placeholder={tc(
                        "AdminArticleCreation.placeholders.summary",
                      )}
                      rows={4}
                      className={`text-sm ${
                        isPreviewMode ? "text-gray-400" : ""
                      }`}
                      readOnly={isPreviewMode}
                    />
                  </div>
                </div>

                <Separator />
                <div className="flex flex-col gap-3 sm:flex-row">
                  {isEditMode && (
                    <>
                      {!isPreviewMode && isEditMode && (
                        <Button
                          variant="outline"
                          onClick={() => setShowBackToCreateDialog(true)}
                          className="w-full text-sm sm:w-auto"
                        >
                          {tc("AdminArticleCreation.buttons.backToCreate")}
                        </Button>
                      )}
                      <Button
                        onClick={() => {
                          setShowApprovalDialog(true);
                        }}
                        disabled={isGenerating}
                        className="w-full text-sm sm:w-auto"
                      >
                        {isGenerating && loadingType === "approve" ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        {tc("AdminArticleCreation.buttons.approveAndPublish")}
                      </Button>
                      <Button
                        onClick={handleSaveArticle}
                        variant="outline"
                        disabled={isGenerating}
                        className="w-full text-sm sm:w-auto"
                      >
                        {isGenerating && loadingType === "save" ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        {tc("AdminArticleCreation.buttons.saveAsDraft")}
                      </Button>
                    </>
                  )}
                  {isPreviewMode && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setCurrentTab("manage")}
                        className="w-full text-sm sm:w-auto"
                      >
                        {tc("AdminArticleCreation.buttons.backToManage")}
                      </Button>
                      <Button
                        onClick={() => {
                          setIsPreviewMode(false);
                          setIsEditMode(true);
                        }}
                        className="w-full text-sm sm:w-auto"
                      >
                        <Edit3 className="mr-2 h-4 w-4" />
                        {tc("AdminArticleCreation.buttons.switchToEdit")}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manage Articles Tab */}
        <TabsContent value="manage" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <CardTitle className="text-lg sm:text-xl">
                    {tc("AdminArticleCreation.manage.title")}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {tc("AdminArticleCreation.manage.description")}
                  </CardDescription>
                </div>
                <Button
                  onClick={fetchUserArticles}
                  disabled={isLoading}
                  variant="outline"
                  size="sm"
                  className="w-full text-sm sm:w-auto"
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${
                      isLoading ? "animate-spin" : ""
                    }`}
                  />
                  {tc("AdminArticleCreation.buttons.refresh")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                  <span className="text-sm">
                    {tc("AdminArticleCreation.manage.loading")}
                  </span>
                </div>
              ) : userArticles.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-gray-500">
                    {tc("AdminArticleCreation.manage.empty")}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userArticles.map((article) => (
                    <Card key={article.id}>
                      <CardHeader className="flex items-center justify-between gap-2">
                        <div className="flex flex-col gap-2">
                          <CardTitle>{article.title}</CardTitle>
                          <CardDescription className="flex items-center justify-between gap-2">
                            {article.type} • {article.genre}{" "}
                          </CardDescription>
                        </div>
                        {/* {getStatusBadge(article.status as ArticleStatus)} */}
                        <Badge variant={article.isDraft ? "default" : "active"}>
                          {article.isDraft ? <Edit3 /> : <CheckCircle2 />}
                          {article.isDraft
                            ? tc("AdminArticleCreation.status.draft")
                            : tc("AdminArticleCreation.status.published")}
                        </Badge>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col gap-2">
                          <div>
                            {tc("AdminArticleCreation.list.topic")}:{" "}
                            {article.topic}
                          </div>
                          <div className="text-muted-foreground flex flex-col items-start gap-2 text-xs font-medium sm:flex-row sm:items-center sm:gap-4 sm:text-sm">
                            <span>
                              {tc("AdminArticleCreation.list.cefr")}:{" "}
                              {article.cefrLevel}
                            </span>
                            <span>
                              {tc("AdminArticleCreation.list.rating")}:{" "}
                              {article.rating}/5
                            </span>
                            <span>
                              {tc("AdminArticleCreation.list.created")}:{" "}
                              {new Date(article.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handlePreviewArticle(article)}
                          className="w-full cursor-pointer text-xs sm:w-auto sm:text-sm"
                        >
                          <Eye className="mr-1 h-3 w-3" />
                          {tc("AdminArticleCreation.buttons.preview")}
                        </Button>
                        {!article.isPublished && (
                          <Button
                            size="sm"
                            onClick={() => handleEditArticle(article)}
                            className="w-full cursor-pointer text-xs sm:w-auto sm:text-sm"
                          >
                            <Edit3 className="mr-1 h-3 w-3" />
                            {tc("AdminArticleCreation.buttons.edit")}
                          </Button>
                        )}
                        {article.isDraft && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setPendingApprovalId(article.id);
                              setShowApprovalDialog(true);
                            }}
                            disabled={isApproving === article.id}
                            variant="accept"
                            className="w-full cursor-pointer text-xs sm:w-auto sm:text-sm"
                          >
                            {isApproving === article.id ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                            )}
                            {tc(
                              "AdminArticleCreation.buttons.approveAndPublish",
                            )}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          disabled={!!deletingArticleId}
                          onClick={() => handleDeleteArticle(article.id)}
                          variant="reject"
                          className="w-full cursor-pointer text-xs sm:w-auto sm:text-sm"
                        >
                          {deletingArticleId === article.id ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <Trash className="mr-1 h-3 w-3" />
                          )}
                          {deletingArticleId === article.id
                            ? tc("AdminArticleCreation.buttons.deleting")
                            : tc("AdminArticleCreation.buttons.delete")}
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
