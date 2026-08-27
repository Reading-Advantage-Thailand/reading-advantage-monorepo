"use client";

import { use } from "react";
import { RepDetailContent } from "../rep-detail-content";

/** Resolves the locale route parameter before rendering representative detail. */
export default function RepDetailPage({
  params,
}: {
  params: Promise<{ repId: string }>;
}) {
  const { repId } = use(params);
  return <RepDetailContent repId={repId} />;
}
