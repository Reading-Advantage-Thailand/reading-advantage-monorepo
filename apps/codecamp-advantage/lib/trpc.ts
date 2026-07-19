import { createTRPCReact, type CreateTRPCReact } from "@trpc/react-query";
import type { CodecampAppRouter } from "@reading-advantage/api/codecamp";

/** Provides the typed tRPC React client for Codecamp-only capabilities. */
export const trpc: CreateTRPCReact<CodecampAppRouter, unknown> =
  createTRPCReact<CodecampAppRouter>();
