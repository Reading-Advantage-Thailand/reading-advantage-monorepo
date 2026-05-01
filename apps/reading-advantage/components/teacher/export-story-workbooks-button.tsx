"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useState } from "react";

interface Chapter {
  id: string;
  title: string;
  chapterNumber: number;
}

interface ExportStoryWorkbooksButtonProps {
  chapters: Chapter[];
  storyTitle: string;
}

export default function ExportStoryWorkbooksButton({
  chapters,
  storyTitle,
}: ExportStoryWorkbooksButtonProps) {
  const [loading, setLoading] = useState(false);
  const [currentChapter, setCurrentChapter] = useState(0);

  const handleExport = async () => {
    if (!chapters || chapters.length === 0) return;

    setLoading(true);
    setCurrentChapter(0);

    const exportPromises = chapters.map(async (chapter, index) => {
      try {
        const response = await fetch(
          `/api/v1/articles/${chapter.id}/export-workbook`
        );

        if (!response.ok) {
          console.error(
            `Failed to export workbook for chapter ${chapter.chapterNumber}`
          );
          return;
        }

        const workbookData = await response.json();
        const dataStr =
          "data:text/json;charset=utf-8," +
          encodeURIComponent(JSON.stringify(workbookData, null, 2));

        const downloadAnchorNode = document.createElement("a");
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute(
          "download",
          `${storyTitle.replace(/\s+/g, "_")}_Ch${chapter.chapterNumber}_${chapter.title.replace(/\s+/g, "_")}_workbook.json`
        );
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();

        // Update progress just for visual feedback, though it might jump around
        setCurrentChapter((prev) => prev + 1);
      } catch (e) {
        console.error("Export failed for chapter", chapter.id, e);
      }
    });

    await Promise.all(exportPromises);

    setLoading(false);
    setCurrentChapter(0);
  };

  return (
    <Button onClick={handleExport} disabled={loading}>
      <Download className="h-4 w-4 mr-2" />
      {loading
        ? `Exporting... (${currentChapter}/${chapters.length})`
        : "Export Story Workbooks"}
    </Button>
  );
}
