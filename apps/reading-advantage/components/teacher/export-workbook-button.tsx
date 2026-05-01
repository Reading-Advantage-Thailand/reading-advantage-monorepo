"use client";

import { Button } from "@/components/ui/button";
import { Article } from "@/components/models/article-model";
import { Download } from "lucide-react";
import { useState } from "react";
import { useScopedI18n } from "@/locales/client";

interface ExportWorkbookButtonProps {
  article: Article;
  articleId: string;
}

export default function ExportWorkbookButton({
  article,
  articleId,
}: ExportWorkbookButtonProps) {
  const t = useScopedI18n("components.exportWorkbookButton");
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);

      // Call the new export-workbook API endpoint
      const response = await fetch(
        `/api/v1/articles/${articleId}/export-workbook`
      );

      if (!response.ok) {
        throw new Error(`Failed to export workbook: ${response.statusText}`);
      }

      const workbookData = await response.json();

      // Trigger Download
      const dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(workbookData, null, 2));
      const downloadAnchorNode = document.createElement("a");
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute(
        "download",
        `${article.title.replace(/\s+/g, "_")}_workbook.json`
      );
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      // alert(t("success")); // Optional: feedback
    } catch (error) {
      console.error("Failed to export workbook data", error);
      alert(t("error") + ". See console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button className="gap-2" size="sm" onClick={handleExport} disabled={loading}>
      <Download className="h-4 w-4" />
      {loading ? t("exporting") : t("buttonText")}
    </Button>
  );
}
