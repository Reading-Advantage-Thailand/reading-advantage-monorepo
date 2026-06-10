import { eq } from "drizzle-orm";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { articles } from "@reading-advantage/db/schema";

/**
 * Creates a new article.
 * @param db - Tenant-scoped database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Article creation fields (title, content, summary, level, cefrLevel, topic, image)
 * @returns The newly created article
 */
export async function createArticle({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: {
    title: string;
    content: string;
    summary?: string;
    level?: number;
    cefrLevel?: string;
    topic?: string;
    image?: string;
  };
}) {
  assertCan(user, "article:create", tenant);

  const rawDb = db.unscoped("articles is a global content catalog with no schoolId");

  const [article] = await rawDb
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
  input: {
    id: string;
    title?: string;
    content?: string;
    summary?: string;
    published?: boolean;
  };
}) {
  assertCan(user, "article:update", tenant);

  const rawDb = db.unscoped("articles is a global content catalog with no schoolId");
  const { id, ...updates } = input;

  const [updated] = await rawDb
    .update(articles)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(articles.id, id))
    .returning();

  if (!updated) {
    throw new Error("Article not found");
  }

  return updated;
}
