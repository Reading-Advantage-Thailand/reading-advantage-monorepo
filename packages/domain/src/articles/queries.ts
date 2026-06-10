import { and, eq } from "drizzle-orm";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { articles } from "@reading-advantage/db/schema";

/**
 * Lists articles for a school with optional topic and CEFR level filtering.
 * @param db - Tenant-scoped database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Filter options including topic, cefrLevel, limit, and offset
 * @returns Array of articles matching the filter criteria
 */
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

  const rawDb = db.unscoped("articles is a global content catalog with no schoolId");

  const conditions = [];
  if (input.topic) {
    conditions.push(eq(articles.topic, input.topic));
  }
  if (input.cefrLevel) {
    conditions.push(eq(articles.cefrLevel, input.cefrLevel));
  }

  const query = rawDb
    .select()
    .from(articles);

  const filtered = conditions.length > 0
    ? query.where(and(...conditions))
    : query;

  return filtered
    .limit(input.limit)
    .offset(input.offset);
}

/**
 * Gets a single article by ID.
 * @param db - Tenant-scoped database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Object containing the article ID
 * @returns The article if found, throws Error if not found
 */
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

  const rawDb = db.unscoped("articles is a global content catalog with no schoolId");

  const [article] = await rawDb
    .select()
    .from(articles)
    .where(eq(articles.id, input.id))
    .limit(1);

  if (!article) {
    throw new Error("Article not found");
  }

  return article;
}
