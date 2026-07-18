import { createTRPCReact, type CreateTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@reading-advantage/api";

/** Provides the typed tRPC React client for the Sales application. */
export const trpc: CreateTRPCReact<AppRouter, unknown> = createTRPCReact<AppRouter>();
