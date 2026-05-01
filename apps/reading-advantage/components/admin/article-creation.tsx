"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/components/ui/use-toast";
import { useScopedI18n } from "@/locales/client";

interface StatusConfig {
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface StatusConfigMap {
  draft: StatusConfig;
  approved: StatusConfig;
  published: StatusConfig;
}

type ArticleStatus = keyof StatusConfigMap;

interface Timepoint {
  file: string;
  index: number;
  markName: string;
  sentences: string;
  timeSeconds: number;
}

interface TranslatedContent {
  cn: string[];
  en: string[];
  th: string[];
  tw: string[];
  vi: string[];
}

interface TranslatedSummary {
  cn: string;
  en: string;
  th: string;
  tw: string;
  vi: string;
}

interface ArticleResponse {
  id: string;
  type: string;
  genre: string;
  subgenre?: string;
  title: string;
  summary: string;
  passage: string;
  image_description: string;
  cefr_level: string;
  ra_level: number;
  average_rating: number;
  audio_url: string;
  created_at: string;
  timepoints: Timepoint[];
  translatedPassage: TranslatedContent;
  translatedSummary: TranslatedSummary;
  read_count: number;
}

interface UserArticle {
  id: string;
  title: string;
  type: string;
  genre: string;
  subgenre?: string;
  cefr_level: string;
  status: string;
  createdAt: string;
  wordCount: number;
  rating: number;
  passage: string;
  summary: string;
  imageDesc: string;
  topic: string;
  ra_level?: number;
  average_rating?: number;
  audio_url?: string;
  timepoints?: Timepoint[];
  translatedPassage?: TranslatedContent;
  translatedSummary?: TranslatedSummary;
  read_count?: number;
  image_description?: string;
}

const AdminArticleCreation = () => {
  const [articleType, setArticleType] = useState("");
  const [genre, setGenre] = useState("");
  const [subgenre, setSubgenre] = useState("");
  const [topic, setTopic] = useState("");
  const [cefrLevel, setCefrLevel] = useState("");
  const [wordCount, setWordCount] = useState(500);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTab, setCurrentTab] = useState("create");
  const [genres, setGenres] = useState<{
    fiction: Array<{
      value: string;
      label: string;
      subgenres: string[];
    }>;
    nonfiction: Array<{
      value: string;
      label: string;
      subgenres: string[];
    }>;
  }>({
    fiction: [],
    nonfiction: [],
  });
  const [isLoadingGenres, setIsLoadingGenres] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedData, setGeneratedData] = useState<{
    title: string;
    passage: string;
    summary: string;
    imageDesc: string;
  } | null>(null);
  const [userArticles, setUserArticles] = useState<UserArticle[]>([]);
  const [isLoadingArticles, setIsLoadingArticles] = useState(false);
  const [isApproving, setIsApproving] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState("");
  const [showLoadingDialog, setShowLoadingDialog] = useState(false);
  const [loadingType, setLoadingType] = useState<
    "generate" | "save" | "approve"
  >("generate");
  const { toast } = useToast();
  const [selectedArticleForEdit, setSelectedArticleForEdit] =
    useState<UserArticle | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [pendingApprovalId, setPendingApprovalId] = useState<string | null>(
    null
  );
  const [originalContent, setOriginalContent] = useState<{
    title: string;
    passage: string;
    summary: string;
    imageDesc: string;
  } | null>(null);
  const [showApprovePublishDialog, setShowApprovePublishDialog] =
    useState(false);
  const [hasContentChanged, setHasContentChanged] = useState(false);
  // เพิ่ม state สำหรับการจัดการข้อมูลเพิ่มเติม
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  const [showTimepoints, setShowTimepoints] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  // เพิ่ม state สำหรับเก็บข้อมูล response ที่สมบูรณ์
  const [fullArticleData, setFullArticleData] =
    useState<ArticleResponse | null>(null);
  const t = useScopedI18n("pages.admin");

  const loadingMessages = {
    generate: [
      t("generate.0"),
      t("generate.1"),
      t("generate.2"),
      t("generate.3"),
      t("generate.4"),
      t("generate.5"),
      t("generate.6"),
      t("generate.7"),
      t("generate.8"),
      t("generate.9"),
      t("generate.10"),
      t("generate.11"),
      t("generate.12"),
      t("generate.13"),
      t("generate.14"),
    ],
    save: [
      t("save.0"),
      t("save.1"),
      t("save.2"),
      t("save.3"),
      t("save.4"),
      t("save.5"),
      t("save.6"),
      t("save.7"),
      t("save.8"),
      t("save.9"),
    ],
    approve: [
      t("approve.0"),
      t("approve.1"),
      t("approve.2"),
      t("approve.3"),
      t("approve.4"),
      t("approve.5"),
      t("approve.6"),
      t("approve.7"),
    ],
  };

  const getLoadingTitle = () => {
    switch (loadingType) {
      case "generate":
        return "Generating Your Article";
      case "save":
        return "Saving Article Draft";
      case "approve":
        return "Approving & Publishing Article";
      default:
        return "Processing...";
    }
  };

  const getLoadingDescription = () => {
    switch (loadingType) {
      case "generate":
        return "Please wait while AI creates your amazing content...";
      case "save":
        return "Saving your changes as a draft...";
      case "approve":
        return "Publishing your article to the platform...";
      default:
        return "Please wait...";
    }
  };

  const getLoadingIcon = () => {
    switch (loadingType) {
      case "generate":
        return <Sparkles className="h-5 w-5 text-blue-500 animate-pulse" />;
      case "save":
        return <Save className="h-5 w-5 text-green-500 animate-pulse" />;
      case "approve":
        return (
          <CheckCircle2 className="h-5 w-5 text-purple-500 animate-pulse" />
        );
      default:
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
    }
  };

  const checkContentChanged = () => {
    if (!originalContent || !generatedData) return false;

    return (
      originalContent.title !== generatedData.title ||
      originalContent.passage !== generatedData.passage ||
      originalContent.summary !== generatedData.summary ||
      originalContent.imageDesc !== generatedData.imageDesc
    );
  };

  useEffect(() => {
    setHasContentChanged(checkContentChanged());
  }, [generatedData, originalContent]);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        setIsLoadingGenres(true);
        const response = await fetch("/api/v1/articles/genres");
        if (!response.ok) {
          throw new Error("Failed to fetch genres");
        }
        const data = await response.json();
        setGenres(data);
      } catch (error) {
        console.error("Error fetching genres:", error);
        setGenres({ fiction: [], nonfiction: [] });
      } finally {
        setIsLoadingGenres(false);
      }
    };

    fetchGenres();
  }, []);

  useEffect(() => {
    let progressInterval: NodeJS.Timeout;
    let messageInterval: NodeJS.Timeout;

    if (isGenerating) {
      setShowLoadingDialog(true);
      setLoadingProgress(0);
      setCurrentMessage(loadingMessages[loadingType][0]);

      const getProgressConfig = () => {
        switch (loadingType) {
          case "generate":
            return {
              interval: 800,
              increment: () => {
                return Math.random() * 0.8 + 0.6;
              },
            };
          case "save":
            return {
              interval: 800,
              increment: () => {
                return Math.random() * 0.8 + 0.2;
              },
            };
          case "approve":
            return {
              interval: 800,
              increment: () => {
                return Math.random() * 10 + 8.2;
              },
            };
          default:
            return {
              interval: 1000,
              increment: () => Math.random() * 1 + 0.5,
            };
        }
      };

      const config = getProgressConfig();

      progressInterval = setInterval(() => {
        setLoadingProgress((prev) => {
          const increment = config.increment();
          const newProgress = prev + increment;

          if (newProgress >= 98) {
            return Math.min(98, prev + increment * 0.1);
          }

          return newProgress;
        });
      }, config.interval);

      messageInterval = setInterval(() => {
        const messages = loadingMessages[loadingType];
        const randomIndex = Math.floor(Math.random() * messages.length);
        setCurrentMessage(messages[randomIndex]);
      }, 3000);
    } else {
      setShowLoadingDialog(false);
      setLoadingProgress(0);
    }

    return () => {
      if (progressInterval) clearInterval(progressInterval);
      if (messageInterval) clearInterval(messageInterval);
    };
  }, [isGenerating, loadingType]);

  useEffect(() => {
    if (currentTab === "manage") {
      fetchUserArticles();
      // Reset editing states when going to manage tab
      setSelectedArticleForEdit(null);
      setGeneratedData(null);
      setOriginalContent(null);
      setHasContentChanged(false);
      setIsPreviewMode(false);
    }
  }, [currentTab]);

  useEffect(() => {
    if (
      !showLoadingDialog &&
      !showApprovalDialog &&
      !showApprovePublishDialog
    ) {
      document.body.style.pointerEvents = "auto";
    }
  }, [showLoadingDialog, showApprovalDialog, showApprovePublishDialog]);

  const fetchUserArticles = async () => {
    try {
      setIsLoadingArticles(true);
      const response = await fetch(
        "/api/v1/articles/generate/custom-generate/user-generated"
      );
      if (!response.ok) {
        throw new Error("Failed to fetch articles");
      }
      const data = await response.json();
      setUserArticles(data.articles || []);
    } catch (error) {
      console.error("Error fetching user articles:", error);
      toast({
        title: "Error",
        description: "Failed to fetch articles",
        variant: "destructive",
      });
    } finally {
      setIsLoadingArticles(false);
    }
  };

  const handleApprove = (articleId: string) => {
    setPendingApprovalId(articleId);
    setShowApprovalDialog(true);
  };

  const confirmApproval = async () => {
    // Use selectedArticleForEdit's ID if it exists, otherwise use pendingApprovalId
    const articleIdToApprove = selectedArticleForEdit?.id || pendingApprovalId;
    if (!articleIdToApprove) return;

    try {
      setLoadingType("approve");
      setIsGenerating(true);
      setIsApproving(articleIdToApprove);
      setShowApprovalDialog(false);

      const response = await fetch(
        "/api/v1/articles/generate/custom-generate/user-generated",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ articleId: articleIdToApprove }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to approve article");
      }

      // Complete the progress
      setLoadingProgress(100);
      setCurrentMessage("🎉 Article approved and published successfully!");

      // Small delay to show completion
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update the article status in the local state
      setUserArticles((prev) =>
        prev.map((article) =>
          article.id === pendingApprovalId
            ? { ...article, status: "approved" }
            : article
        )
      );

      // Reset all related states
      setSelectedArticleForEdit(null);
      setGeneratedData(null);
      setOriginalContent(null);
      setHasContentChanged(false);

      toast({
        title: "Success",
        description: "Article approved and published successfully!",
      });

      // Navigate to manage tab after successful approval
      setCurrentTab("manage");
    } catch (error) {
      console.error("Error approving article:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to approve article",
        variant: "destructive",
      });
    } finally {
      // Force reset all states immediately
      setIsGenerating(false);
      setIsApproving(null);
      setPendingApprovalId(null);
      setLoadingProgress(0);
      setCurrentMessage("");
      setShowLoadingDialog(false);
      document.body.style.pointerEvents = "auto";
    }
  };

  const cancelApproval = () => {
    setShowApprovalDialog(false);
    setPendingApprovalId(null);
  };

  const handleGenerate = async () => {
    if (!articleType || !genre || !topic || !cefrLevel) {
      return;
    }

    setLoadingType("generate");
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/v1/articles/generate/custom-generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: articleType,
            genre,
            subgenre: subgenre || undefined,
            topic,
            cefrLevel,
            wordCount,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to generate article");
      }

      const data = await response.json();

      setLoadingProgress(100);
      setCurrentMessage("🎉 Article generated successfully!");

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // ปรับให้รองรับ response structure ใหม่ แต่ใช้เฉพาะฟิลด์ที่จำเป็นสำหรับ preview
      const articleData = data.article || data; // รองรับทั้ง { article: {...} } และ {...}

      // เก็บข้อมูลครบถ้วนไว้ใน fullArticleData
      setFullArticleData(articleData);

      const newGeneratedData = {
        title: articleData.title,
        passage: articleData.passage,
        summary: articleData.summary,
        imageDesc: articleData.image_description || articleData.imageDesc || "",
      };

      setGeneratedData(newGeneratedData);
      setOriginalContent(newGeneratedData);
      setIsPreviewMode(false); // Set to edit mode
      setCurrentTab("preview");

      toast({
        title: "Success",
        description: "Article generated successfully!",
      });
    } catch (error) {
      console.error("Error generating article:", error);
      setError(
        error instanceof Error ? error.message : "Unknown error occurred"
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
      imageDesc: article.imageDesc || article.image_description || "",
    };
    setGeneratedData(articleData);
    // เซ็ต original content
    setOriginalContent(articleData);
    setCurrentTab("preview");
  };

  const handleEditArticle = async (article: UserArticle) => {
    // รอให้ state ถูกเซ็ตเสร็จก่อนเปลี่ยน tab
    await Promise.all([
      new Promise<void>((resolve) => {
        setSelectedArticleForEdit(article);
        resolve();
      }),
      new Promise<void>((resolve) => {
        setIsPreviewMode(false);
        resolve();
      }),
    ]);

    const articleData = {
      title: article.title,
      passage: article.passage,
      summary: article.summary,
      imageDesc: article.imageDesc || article.image_description || "",
    };

    await Promise.all([
      new Promise<void>((resolve) => {
        setGeneratedData(articleData);
        resolve();
      }),
      new Promise<void>((resolve) => {
        setOriginalContent(articleData);
        resolve();
      }),
    ]);

    // รอให้ state ทั้งหมดถูก update เสร็จก่อนเปลี่ยน tab
    await new Promise((resolve) => setTimeout(resolve, 0));
    setCurrentTab("preview");
  };

  const handleSaveArticle = async () => {
    // หากไม่มีการแก้ไข ให้ redirect ไปยังหน้า manage เลย
    if (!hasContentChanged) {
      setCurrentTab("manage");
      return;
    }

    // หากมีการแก้ไข ให้เรียกใช้ API เพื่อบันทึก
    if (!selectedArticleForEdit || !generatedData) {
      toast({
        title: "Error",
        description: "No article selected or no data to save",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoadingType("save");
      setIsGenerating(true);

      const response = await fetch(
        `/api/v1/articles/generate/custom-generate/user-generated/${selectedArticleForEdit.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: generatedData.title,
            passage: generatedData.passage,
            summary: generatedData.summary,
            imageDesc: generatedData.imageDesc,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to save article");
      }

      // Complete the progress
      setLoadingProgress(100);
      setCurrentMessage("✅ Article saved successfully!");

      // Small delay to show completion
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: "Success",
        description: "Article saved successfully!",
      });

      // Refresh the articles list
      await fetchUserArticles();

      // Update local state
      setUserArticles((prev) =>
        prev.map((article) =>
          article.id === selectedArticleForEdit.id
            ? { ...article, ...generatedData }
            : article
        )
      );

      // อัปเดต original content ให้เป็นข้อมูลใหม่ที่บันทึกแล้ว
      setOriginalContent(generatedData);

      // Navigate to manage tab
      setCurrentTab("manage");
    } catch (error) {
      console.error("Error saving article:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save article",
        variant: "destructive",
      });
    } finally {
      // Force reset loading states immediately
      setIsGenerating(false);
      setLoadingProgress(0);
      setCurrentMessage("");
      setShowLoadingDialog(false);
      document.body.style.pointerEvents = "auto";
    }
  };

  const getStatusBadge = (status: ArticleStatus) => {
    const statusConfig: StatusConfigMap = {
      draft: { color: "bg-gray-100 text-gray-800", icon: Edit3 },
      approved: { color: "bg-blue-100 text-blue-800", icon: CheckCircle2 },
      published: { color: "bg-green-100 text-green-800", icon: CheckCircle2 },
    };

    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {t(status) || status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleApprovePublishClick = () => {
    if (selectedArticleForEdit) {
      setPendingApprovalId(selectedArticleForEdit.id);
    }
    setShowApprovePublishDialog(true);
  };

  const confirmApprovePublish = async () => {
    setShowApprovePublishDialog(false);

    if (hasContentChanged) {
      // ถ้ามีการแก้ไข ใช้ handleApproveAndPublish
      await handleApproveAndPublish();
    } else {
      // ถ้าไม่มีการแก้ไข ใช้ confirmApproval โดยตรง
      if (selectedArticleForEdit) {
        // เซ็ต pendingApprovalId ก่อนเรียก confirmApproval
        const articleId = selectedArticleForEdit.id;
        setPendingApprovalId(articleId);
        // รอให้ state update เสร็จก่อนเรียก confirmApproval
        await new Promise((resolve) => setTimeout(resolve, 0));
        await confirmApproval();
      }
    }
  };

  const cancelApprovePublish = () => {
    setShowApprovePublishDialog(false);
  };

  const handleApproveAndPublish = async () => {
    if (!selectedArticleForEdit || !generatedData) return;

    try {
      setLoadingType("approve");
      setIsGenerating(true);

      // First update the article with new data
      if (hasContentChanged) {
        const updateResponse = await fetch(
          `/api/v1/articles/generate/custom-generate/user-generated/${selectedArticleForEdit.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: generatedData.title,
              passage: generatedData.passage,
              summary: generatedData.summary,
              imageDesc: generatedData.imageDesc,
            }),
          }
        );

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json();
          throw new Error(errorData.details || "Failed to update article");
        }
      }

      // Set pendingApprovalId before approval
      setPendingApprovalId(selectedArticleForEdit.id);

      // Then approve the article using the same logic as confirmApproval
      const approveResponse = await fetch(
        "/api/v1/articles/generate/custom-generate/user-generated",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articleId: selectedArticleForEdit.id }),
        }
      );

      if (!approveResponse.ok) {
        const errorData = await approveResponse.json();
        throw new Error(errorData.details || "Failed to approve article");
      }

      // Complete the progress
      setLoadingProgress(100);
      setCurrentMessage("🎉 Article approved and published successfully!");

      // Small delay to show completion
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: "Success",
        description: "Article approved and published successfully!",
      });

      // Refresh the articles list
      await fetchUserArticles();

      // Update local state
      setUserArticles((prev) =>
        prev.map((article) =>
          article.id === selectedArticleForEdit.id
            ? { ...article, status: "approved", ...generatedData }
            : article
        )
      );

      // Go back to manage tab
      setCurrentTab("manage");
    } catch (error) {
      console.error("Error approving article:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to approve article",
        variant: "destructive",
      });
    } finally {
      // Force reset all states immediately
      setIsGenerating(false);
      setIsApproving(null);
      setPendingApprovalId(null);
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

  const currentGenres = articleType
    ? genres[articleType as keyof typeof genres] || []
    : [];
  const currentSubgenres = genre
    ? currentGenres.find((g) => g.value === genre)?.subgenres || []
    : [];

  const isArticlePublished = (status: string) => {
    return status === "published" || status === "approved";
  };

  return (
    <div className="w-full mx-auto px-4 sm:px-6 space-y-6">
      {/* Approval Confirmation Dialog */}
      <AlertDialog
        open={showApprovalDialog}
        onOpenChange={setShowApprovalDialog}
      >
        <AlertDialogContent className="max-w-sm sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-sm sm:text-base">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
              {t("confirmApprovalTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-sm">
              <span>{t("confirmApprovalMessage")}</span>
              <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                <span className="text-sm text-orange-800 font-medium">
                  {t("confirmApprovalMessage")}
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel
              onClick={cancelApproval}
              className="w-full sm:w-auto"
            >
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmApproval}
              className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto"
            >
              {t("confirmPublish")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approve & Publish Confirmation Dialog */}
      <AlertDialog
        open={showApprovePublishDialog}
        onOpenChange={setShowApprovePublishDialog}
      >
        <AlertDialogContent className="max-w-sm sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-sm sm:text-base">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
              {t("modalTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-sm">
              <span>{t("confirmApprovalMessage")}</span>

              {hasContentChanged && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <span className="text-sm text-blue-800 font-medium block">
                    {t("modalContentChanged")}
                  </span>
                  <span className="text-sm text-blue-700 mt-1 block">
                    {t("modalContentNote")}
                  </span>
                </div>
              )}

              <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                <span className="text-sm text-orange-800 font-medium">
                  {t("modalFinalWarning")}
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel
              onClick={cancelApprovePublish}
              className="w-full sm:w-auto"
            >
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmApprovePublish}
              className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto"
            >
              {hasContentChanged
                ? `${t("approveAndPublish")}`
                : `${t("approveAndPublish")}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Loading Dialog */}
      <Dialog open={showLoadingDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-center justify-center text-sm sm:text-base">
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
                  className={`h-12 w-12 sm:h-16 sm:w-16 animate-spin ${
                    loadingType === "generate"
                      ? "text-blue-500"
                      : loadingType === "save"
                        ? "text-green-500"
                        : "text-purple-500"
                  }`}
                />
                <div
                  className={`absolute inset-0 rounded-full animate-pulse opacity-30 ${
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
                <span className="text-gray-600">{t("progress")}</span>
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
              <p className="text-xs sm:text-sm text-gray-700 animate-pulse min-h-[20px]">
                {currentMessage}
              </p>
            </div>

            {/* Animated Dots */}
            <div className="flex justify-center space-x-1">
              <div
                className={`w-2 h-2 rounded-full animate-bounce ${
                  loadingType === "generate"
                    ? "bg-blue-400"
                    : loadingType === "save"
                      ? "bg-green-400"
                      : "bg-purple-400"
                }`}
              ></div>
              <div
                className={`w-2 h-2 rounded-full animate-bounce ${
                  loadingType === "generate"
                    ? "bg-blue-400"
                    : loadingType === "save"
                      ? "bg-green-400"
                      : "bg-purple-400"
                }`}
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className={`w-2 h-2 rounded-full animate-bounce ${
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
            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center text-xs text-gray-500 pt-2 border-t">
              <div>
                <div className="font-medium text-gray-700">{t("type")}</div>
                <div className="capitalize">
                  {selectedArticleForEdit?.type || articleType}
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-700">{t("level")}</div>
                <div>{selectedArticleForEdit?.cefr_level || cefrLevel}</div>
              </div>
              <div>
                <div className="font-medium text-gray-700">{t("words")}</div>
                <div>~{selectedArticleForEdit?.wordCount || wordCount}</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="text-start space-y-2">
        <h1 className="text-2xl sm:text-4xl font-bold">
          {t("articlePageTitle")}
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          {t("articlePageDesc")}
        </p>
      </div>

      {/* Main Content */}
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 text-xs sm:text-sm">
          <TabsTrigger value="create">{t("createArticle")}</TabsTrigger>
          <TabsTrigger value="preview">{t("previewEdit")}</TabsTrigger>
          <TabsTrigger value="manage">{t("manageArticles")}</TabsTrigger>
        </TabsList>

        {/* Create Article Tab */}
        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                {t("aiArticleGenerator")}
              </CardTitle>
              <CardDescription className="text-sm">
                {t("aiArticleGeneratorDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="type" className="text-sm sm:text-base">
                      {t("articleType")}
                    </Label>
                    <RadioGroup
                      value={articleType}
                      onValueChange={setArticleType}
                      className="flex flex-col sm:flex-row mt-2 gap-4 sm:gap-8"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="fiction" id="fiction" />
                        <Label
                          htmlFor="fiction"
                          className="text-sm sm:text-base"
                        >
                          {t("fiction")}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="nonfiction" id="nonfiction" />
                        <Label
                          htmlFor="nonfiction"
                          className="text-sm sm:text-base"
                        >
                          {t("nonFiction")}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <Label htmlFor="genre" className="text-sm sm:text-base">
                      {t("genre")}
                    </Label>
                    <Select
                      value={genre}
                      onValueChange={setGenre}
                      disabled={!articleType || isLoadingGenres}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue
                          placeholder={
                            isLoadingGenres
                              ? "Loading genres..."
                              : "Select a genre"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {currentGenres.map((g) => (
                          <SelectItem
                            key={g.value}
                            value={g.value}
                            className="text-sm"
                          >
                            {g.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="subgenre" className="text-sm sm:text-base">
                      {t("subgenre")}
                    </Label>
                    <Select
                      value={subgenre}
                      onValueChange={setSubgenre}
                      disabled={!genre}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select a subgenre" />
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
                      {t("cefrLevel")}
                    </Label>
                    <Select value={cefrLevel} onValueChange={setCefrLevel}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select CEFR level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A1" className="text-sm">
                          {t("cefrLevels.0")}
                        </SelectItem>
                        <SelectItem value="A2" className="text-sm">
                          {t("cefrLevels.1")}
                        </SelectItem>
                        <SelectItem value="B1" className="text-sm">
                          {t("cefrLevels.2")}
                        </SelectItem>
                        <SelectItem value="B2" className="text-sm">
                          {t("cefrLevels.3")}
                        </SelectItem>
                        <SelectItem value="C1" className="text-sm">
                          {t("cefrLevels.4")}
                        </SelectItem>
                        <SelectItem value="C2" className="text-sm">
                          {t("cefrLevels.5")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="wordcount" className="text-sm sm:text-base">
                      {t("targetWordCount")}: {wordCount}
                    </Label>
                    <input
                      type="range"
                      min="200"
                      max="1500"
                      step="50"
                      value={wordCount}
                      onChange={(e) => setWordCount(parseInt(e.target.value))}
                      className="w-full mt-2"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>200</span>
                      <span>1500</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="topic" className="text-sm sm:text-base">
                  {t("articleTopic")}
                </Label>
                <Textarea
                  placeholder="Describe the specific topic or theme you want the article to cover..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  rows={3}
                  className="mt-2 text-sm"
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded-md">
                  Error: {error}
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
                <Sparkles className="h-4 w-4 mr-2" />
                {t("generateWithAI")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview & Edit Tab */}
        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                {isPreviewMode ? "Article Preview" : "Article Editor"}
                {/* เพิ่ม indicator สำหรับการเปลี่ยนแปลง */}
                {hasContentChanged && !isPreviewMode && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    <Edit3 className="h-3 w-3 mr-1" />
                    {t("modified")}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-sm">
                {isPreviewMode
                  ? "Review the article content (read-only)"
                  : "Review and edit the generated content before approval"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {generatedData ? (
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="outline" className="text-xs">
                      {t("type")}: {selectedArticleForEdit?.type || articleType}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {t("genre")}: {selectedArticleForEdit?.genre || genre}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {t("level")}:{" "}
                      {selectedArticleForEdit?.cefr_level || cefrLevel}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {t("words")}:{" "}
                      {selectedArticleForEdit?.wordCount || wordCount}
                    </Badge>
                    {isPreviewMode && (
                      <Badge variant="secondary" className="text-xs">
                        {t("previewMode")}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label
                        htmlFor="article-title"
                        className="text-sm sm:text-base font-medium"
                      >
                        {t("articleTitle")}
                      </Label>
                      <Input
                        id="article-title"
                        value={generatedData?.title || ""}
                        onChange={(e) =>
                          !isPreviewMode &&
                          setGeneratedData((prev) =>
                            prev ? { ...prev, title: e.target.value } : null
                          )
                        }
                        placeholder="Enter article title..."
                        className={`text-sm sm:text-lg font-semibold ${
                          isPreviewMode ? "text-gray-400" : ""
                        }`}
                        readOnly={isPreviewMode}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="article-content"
                        className="text-sm sm:text-base font-medium"
                      >
                        {t("articleContent")}
                      </Label>
                      <Textarea
                        id="article-content"
                        value={generatedData?.passage || ""}
                        onChange={(e) =>
                          !isPreviewMode &&
                          setGeneratedData((prev) =>
                            prev ? { ...prev, passage: e.target.value } : null
                          )
                        }
                        placeholder="Enter the main article content..."
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
                        className="text-sm sm:text-base font-medium"
                      >
                        {t("summary")}
                      </Label>
                      <Textarea
                        id="article-summary"
                        value={generatedData?.summary || ""}
                        onChange={(e) =>
                          !isPreviewMode &&
                          setGeneratedData((prev) =>
                            prev ? { ...prev, summary: e.target.value } : null
                          )
                        }
                        placeholder="Enter article summary..."
                        rows={4}
                        className={`text-sm ${
                          isPreviewMode ? "text-gray-400" : ""
                        }`}
                        readOnly={isPreviewMode}
                      />
                    </div>
                  </div>

                  <Separator />
                  <div className="flex flex-col sm:flex-row gap-3">
                    {isPreviewMode ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => setCurrentTab("manage")}
                          className="w-full sm:w-auto text-sm"
                        >
                          {t("backToManage")}
                        </Button>
                        {selectedArticleForEdit &&
                          !isArticlePublished(
                            selectedArticleForEdit.status
                          ) && (
                            <Button
                              onClick={() => {
                                setIsPreviewMode(false);
                              }}
                              className="w-full sm:w-auto text-sm"
                            >
                              <Edit3 className="h-4 w-4 mr-2" />
                              {t("switchToEdit")}
                            </Button>
                          )}
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (selectedArticleForEdit) {
                              setCurrentTab("manage");
                            } else {
                              setIsPreviewMode(true);
                            }
                          }}
                          className="w-full sm:w-auto text-sm"
                        >
                          {selectedArticleForEdit
                            ? "Back to Manage"
                            : "Preview Mode"}
                        </Button>
                        {selectedArticleForEdit ? (
                          <Button
                            onClick={handleApprovePublishClick}
                            disabled={isGenerating}
                            className="w-full sm:w-auto text-sm"
                          >
                            {isGenerating && loadingType === "approve" ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                            )}
                            {t("approveAndPublish")}
                          </Button>
                        ) : (
                          <Button
                            onClick={handleApprovePublishClick}
                            className="w-full sm:w-auto text-sm"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            {t("approveAndPublish")}
                          </Button>
                        )}
                        <Button
                          onClick={handleSaveArticle}
                          variant="outline"
                          disabled={isGenerating}
                          className="w-full sm:w-auto text-sm"
                        >
                          {isGenerating && loadingType === "save" ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          {hasContentChanged ? "Save Edit" : t("saveAsDraft")}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-sm">{t("noContentYet")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manage Articles Tab */}
        <TabsContent value="manage" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg sm:text-xl">
                    {t("articleManagement")}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {t("manageDesc")}
                  </CardDescription>
                </div>
                <Button
                  onClick={fetchUserArticles}
                  disabled={isLoadingArticles}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto text-sm"
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${
                      isLoadingArticles ? "animate-spin" : ""
                    }`}
                  />
                  {t("refresh")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingArticles ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span className="text-sm">{t("loadingArticles")}</span>
                </div>
              ) : userArticles.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-sm">
                    {t("noArticlesFound")}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userArticles.map((article) => (
                    <div
                      key={article.id}
                      className="relative border rounded-lg p-4 space-y-3 overflow-hidden"
                      style={{
                        backgroundImage: `linear-gradient(to right, rgba(192, 192, 192, 0.95) 0%, rgba(192, 192, 192, 0.85) 50%, rgba(192, 192, 192, 0.3) 100%), url('https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/images/${article.id}.png')`,
                        backgroundSize: "cover",
                        backgroundPosition: "center right",
                        backgroundRepeat: "no-repeat",
                      }}
                    >
                      {/* Content */}
                      <div className="relative z-10">
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm sm:text-base text-gray-900">
                              {article.title}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-700 font-medium">
                              {article.type} • {article.genre} •{" "}
                              {article.wordCount} Words
                            </p>
                            <p className="text-xs text-gray-600 mt-1 font-medium">
                              {t("topic")}: {article.topic}
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            {getStatusBadge(article.status as ArticleStatus)}
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 font-medium">
                          <span>CEFR: {article.cefr_level}</span>
                          <span>
                            {t("rating")}: {article.rating}/5
                          </span>
                          <span>
                            {t("created")}:{" "}
                            {new Date(article.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 mt-2">
                          <Button
                            size="sm"
                            onClick={() => handlePreviewArticle(article)}
                            className="w-full sm:w-auto text-xs sm:text-sm"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            {t("preview")}
                          </Button>
                          {!isArticlePublished(article.status) && (
                            <Button
                              size="sm"
                              onClick={() => handleEditArticle(article)}
                              className="w-full sm:w-auto text-xs sm:text-sm"
                            >
                              <Edit3 className="h-3 w-3 mr-1" />
                              {t("edit")}
                            </Button>
                          )}
                          {article.status === "draft" && (
                            <Button
                              size="sm"
                              onClick={() => handleApprove(article.id)}
                              disabled={isApproving === article.id}
                              className="w-full sm:w-auto text-xs sm:text-sm bg-green-600"
                            >
                              {isApproving === article.id ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                              )}
                              {t("approveText")}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminArticleCreation;
