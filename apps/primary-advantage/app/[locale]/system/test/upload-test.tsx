"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import React, { useState, useTransition } from "react";
import { deleteArticleFile, uploadArticleImages } from "@/actions/test";
import { getDeleteArticleById } from "@/actions/article";

export default function UploadTest() {
  const [articleId, setArticleId] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleUpload = async () => {
    startTransition(async () => {
      await uploadArticleImages(articleId);
    });
  };

  const handleDelete = async () => {
    startTransition(async () => {
      await getDeleteArticleById(articleId);
    });
  };

  const handleDeleteFile = async () => {
    startTransition(async () => {
      await deleteArticleFile(articleId);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <h1>Upload Test</h1>
      <Input
        type="text"
        value={articleId}
        onChange={(e) => setArticleId(e.target.value)}
        placeholder="Enter article ID"
      />
      <Button onClick={handleUpload} disabled={isPending}>
        Upload
      </Button>
      <Button onClick={handleDelete} disabled={isPending}>
        Delete All
      </Button>
      <Button onClick={handleDeleteFile} disabled={isPending}>
        Delete File
      </Button>
    </div>
  );
}
