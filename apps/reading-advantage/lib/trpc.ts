"use client";

import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@reading-advantage/api";

export const trpc = createTRPCReact<AppRouter>();
