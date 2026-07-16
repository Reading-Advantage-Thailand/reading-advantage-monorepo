"use client";

import { createTRPCReact, type CreateTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@reading-advantage/api";

/** Client-side tRPC hooks bound to the shared application router. */
export const trpc: CreateTRPCReact<AppRouter, unknown> = createTRPCReact<AppRouter>();
