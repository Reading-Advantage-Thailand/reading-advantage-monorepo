"use client";

import { useState } from "react";
// @ts-ignore
import Handlebars from "handlebars/dist/handlebars.min.js";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FileText,
  FileJson,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useScopedI18n } from "@/locales/client";
import { motion } from "framer-motion";

export default function WorkbookGeneratorPage() {
  const [templateContent, setTemplateContent] = useState<string | null>(null);
  const [jsonContent, setJsonContent] = useState<string | null>(null);
  const [templateFileName, setTemplateFileName] = useState<string>("");
  const [jsonFileName, setJsonFileName] = useState<string>("");
  const [status, setStatus] = useState<{
    type: "idle" | "success" | "error";
    message: string;
  }>({ type: "idle", message: "" });

  const t = useScopedI18n("pages.teacher");

  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: "template" | "json"
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (type === "template") {
      setTemplateFileName(file.name);
    } else {
      setJsonFileName(file.name);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (type === "template") {
        setTemplateContent(content);
      } else {
        setJsonContent(content);
      }
    };
    reader.readAsText(file);
  };

  const handleGenerate = () => {
    if (!templateContent || !jsonContent) {
      setStatus({
        type: "error",
        message: t("workbookGeneratorPage.messages.uploadBothFiles"),
      });
      return;
    }

    try {
      const data = JSON.parse(jsonContent);
      const template = Handlebars.compile(templateContent);
      const resultHtml = template(data);

      const newWindow = window.open("", "_blank");
      if (!newWindow) {
        setStatus({
          type: "error",
          message: t("workbookGeneratorPage.messages.popupBlocked"),
        });
        return;
      }

      newWindow.document.write(resultHtml);
      newWindow.document.close();

      setStatus({
        type: "success",
        message: t("workbookGeneratorPage.messages.successGenerated"),
      });
    } catch (error: any) {
      console.error("Generation Error:", error);
      setStatus({
        type: "error",
        message: `${t("workbookGeneratorPage.messages.errorGenerating")} ${
          error.message
        }`,
      });
    }
  };

  return (
    <div className="container mx-auto pb-6 space-y-6">
      {/* Page Header */}
      <motion.div
        className="space-y-2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {t("workbookGeneratorPage.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("workbookGeneratorPage.description")}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="border-2 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-b">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <CardTitle>{t("workbookGeneratorPage.cardTitle")}</CardTitle>
            </div>
            <CardDescription>
              {t("workbookGeneratorPage.cardDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-6">
            {/* Step 1: Template */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              transition={{ type: "spring", stiffness: 300 }}
              className={`border-2 border-dashed rounded-xl p-6 transition-all duration-300 ${
                templateContent
                  ? "border-green-500 bg-green-50 dark:bg-green-950/20 shadow-md"
                  : "border-gray-300 hover:border-blue-400 hover:shadow-md"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div
                    className={`p-3 rounded-full shadow-sm transition-colors ${
                      templateContent
                        ? "bg-green-100 dark:bg-green-900"
                        : "bg-white dark:bg-gray-800"
                    }`}
                  >
                    {templateContent ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : (
                      <FileText className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 sm:hidden">
                    <Label
                      htmlFor="template-upload"
                      className="text-lg font-semibold cursor-pointer flex items-center gap-2"
                    >
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-bold">
                        1
                      </span>
                      {t("workbookGeneratorPage.step1.title")}
                    </Label>
                  </div>
                </div>

                <div className="flex-1 hidden sm:block">
                  <Label
                    htmlFor="template-upload"
                    className="text-lg font-semibold cursor-pointer flex items-center gap-2"
                  >
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-bold">
                      1
                    </span>
                    {t("workbookGeneratorPage.step1.title")}
                  </Label>
                  <div className="text-sm text-muted-foreground mt-1">
                    {templateFileName ||
                      t("workbookGeneratorPage.step1.placeholder")}
                  </div>
                </div>

                <div className="sm:hidden text-sm text-muted-foreground mb-2 ml-14 -mt-2">
                  {templateFileName ||
                    t("workbookGeneratorPage.step1.placeholder")}
                </div>

                <Input
                  id="template-upload"
                  type="file"
                  accept=".html"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, "template")}
                />
                <Button
                  variant="outline"
                  className="w-full sm:w-auto hover:bg-blue-50 dark:hover:bg-blue-950"
                  onClick={() =>
                    document.getElementById("template-upload")?.click()
                  }
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {t("workbookGeneratorPage.selectButton")}
                </Button>
              </div>
            </motion.div>

            {/* Step 2: Data */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              transition={{ type: "spring", stiffness: 300 }}
              className={`border-2 border-dashed rounded-xl p-6 transition-all duration-300 ${
                jsonContent
                  ? "border-green-500 bg-green-50 dark:bg-green-950/20 shadow-md"
                  : "border-gray-300 hover:border-purple-400 hover:shadow-md"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div
                    className={`p-3 rounded-full shadow-sm transition-colors ${
                      jsonContent
                        ? "bg-green-100 dark:bg-green-900"
                        : "bg-white dark:bg-gray-800"
                    }`}
                  >
                    {jsonContent ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : (
                      <FileJson className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 sm:hidden">
                    <Label
                      htmlFor="json-upload"
                      className="text-lg font-semibold cursor-pointer flex items-center gap-2"
                    >
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-500 text-white text-sm font-bold">
                        2
                      </span>
                      {t("workbookGeneratorPage.step2.title")}
                    </Label>
                  </div>
                </div>

                <div className="flex-1 hidden sm:block">
                  <Label
                    htmlFor="json-upload"
                    className="text-lg font-semibold cursor-pointer flex items-center gap-2"
                  >
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-500 text-white text-sm font-bold">
                      2
                    </span>
                    {t("workbookGeneratorPage.step2.title")}
                  </Label>
                  <div className="text-sm text-muted-foreground mt-1">
                    {jsonFileName ||
                      t("workbookGeneratorPage.step2.placeholder")}
                  </div>
                </div>

                <div className="sm:hidden text-sm text-muted-foreground mb-2 ml-14 -mt-2">
                  {jsonFileName || t("workbookGeneratorPage.step2.placeholder")}
                </div>

                <Input
                  id="json-upload"
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, "json")}
                />
                <Button
                  variant="outline"
                  className="w-full sm:w-auto hover:bg-purple-50 dark:hover:bg-purple-950"
                  onClick={() =>
                    document.getElementById("json-upload")?.click()
                  }
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {t("workbookGeneratorPage.selectButton")}
                </Button>
              </div>
            </motion.div>

            {/* Action */}
            <motion.div
              whileHover={{ scale: templateContent && jsonContent ? 1.02 : 1 }}
              whileTap={{ scale: templateContent && jsonContent ? 0.98 : 1 }}
            >
              <Button
                className="w-full py-6 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
                size="lg"
                disabled={!templateContent || !jsonContent}
                onClick={handleGenerate}
              >
                <Sparkles className="h-5 w-5 mr-2" />
                {t("workbookGeneratorPage.generateButton")}
              </Button>
            </motion.div>

            {/* Status */}
            {status.message && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Alert
                  variant={status.type === "error" ? "destructive" : "default"}
                  className={`${
                    status.type === "success"
                      ? "border-green-500 text-green-700 bg-green-50 dark:bg-green-950/20"
                      : ""
                  }`}
                >
                  {status.type === "error" ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    {status.type === "success"
                      ? t("workbookGeneratorPage.messages.success")
                      : t("workbookGeneratorPage.messages.error")}
                  </AlertTitle>
                  <AlertDescription>{status.message}</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              {t("workbookGeneratorPage.howToUse.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex-shrink-0 mt-0.5">
                1
              </div>
              <p>
                <strong className="text-foreground">
                  {t("workbookGeneratorPage.howToUse.step1Title")}
                </strong>{" "}
                {t("workbookGeneratorPage.howToUse.step1Description")}
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-500 text-white text-xs font-bold flex-shrink-0 mt-0.5">
                2
              </div>
              <p>
                <strong className="text-foreground">
                  {t("workbookGeneratorPage.howToUse.step2Title")}
                </strong>{" "}
                {t("workbookGeneratorPage.howToUse.step2Description")}
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-xs font-bold flex-shrink-0 mt-0.5">
                3
              </div>
              <p>
                <strong className="text-foreground">
                  {t("workbookGeneratorPage.howToUse.step3Title")}
                </strong>{" "}
                {t("workbookGeneratorPage.howToUse.step3Description")}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
