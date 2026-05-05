import { and, eq } from "drizzle-orm";
import { articles } from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";

interface CreateArticleInput {
  title: string;
  content: string;
  summary?: string;
  level?: number;
  cefrLevel?: string;
  topic?: string;
  image?: string;
}

interface UpdateArticleInput {
  id: string;
  title?: string;
  content?: string;
  summary?: string;
  published?: boolean;
}

export async function listArticles({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: { topic?: string; cefrLevel?: string; limit: number; offset: number };
}) {
  assertCan(user, "article:list", tenant);

  const conditions = [];
  if (input.topic) {
    conditions.push(eq(articles.topic, input.topic));
  }
  if (input.cefrLevel) {
    conditions.push(eq(articles.cefrLevel, input.cefrLevel));
  }

  const query = db
    .select()
    .from(articles);

  const filtered = conditions.length > 0
    ? query.where(and(...conditions))
    : query;

  return filtered
    .limit(input.limit)
    .offset(input.offset);
}

export async function getArticle({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: { id: string };
}) {
  assertCan(user, "article:read", tenant);

  const [article] = await db
    .select()
    .from(articles)
    .where(eq(articles.id, input.id))
    .limit(1);

  if (!article) {
    throw new Error("Article not found");
  }

  return article;
}

export async function createArticle({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: CreateArticleInput;
}) {
  assertCan(user, "article:create", tenant);

  const [article] = await db
    .insert(articles)
    .values(input)
    .returning();

  return article;
}

/**
 * Update an article. Only ADMIN and SYSTEM roles have `article:update` permission.
 * Articles have no `authorId` column — global modification by authorized roles is by design.
 */
export async function updateArticle({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: UpdateArticleInput;
}) {
  assertCan(user, "article:update", tenant);

  const { id, ...updates } = input;

  const [updated] = await db
    .update(articles)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(articles.id, id))
    .returning();

  if (!updated) {
    throw new Error("Article not found");
  }

  return updated;
}
