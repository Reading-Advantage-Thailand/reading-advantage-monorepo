import { createTRPCReact, type CreateTRPCReact } from "@trpc/react-query";
import type { SalesAppRouter } from "@reading-advantage/api/sales";

/** Provides the typed tRPC React client for the Sales application. */
export const trpc: CreateTRPCReact<SalesAppRouter, unknown> =
  createTRPCReact<SalesAppRouter>();
