import { eq, and, desc } from "drizzle-orm";
import { codecampChatConversations, codecampChatMessages, codecampModules, codecampLessons } from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";

/**
 * Saves a chat message to an existing conversation or creates a new one.
 */
export async function saveChatMessage({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant;
  input: { conversationId?: string; message: string; moduleId?: string; lessonId?: string; role?: "user" | "assistant" };
}) {
  assertCan(user, "codecamp:chat", tenant);
  const rawDb = db.unscoped("codecamp tables have no schoolId");

  let conversationId = input.conversationId;
  const role = input.role ?? "user";

  return rawDb.transaction(async (tx) => {
    if (conversationId) {
      const [existing] = await tx.select().from(codecampChatConversations)
        .where(and(eq(codecampChatConversations.id, conversationId), eq(codecampChatConversations.userId, user.id))).limit(1);
      if (!existing) throw new Error("Conversation not found");
    } else if (role === "user") {
      const [conversation] = await tx.insert(codecampChatConversations)
        .values({ userId: user.id, title: input.message.slice(0, 60) + (input.message.length > 60 ? "..." : ""), moduleId: input.moduleId ?? null, lessonId: input.lessonId ?? null })
        .returning();
      conversationId = conversation.id;
    } else {
      throw new Error("Conversation not found");
    }

    const [savedMessage] = await tx.insert(codecampChatMessages)
      .values({ conversationId, role, content: input.message }).returning();

    return { conversationId, message: savedMessage };
  });
}

/**
 * Retrieves the full message history for a chat conversation.
 */
export async function getChatHistory({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant; input: { conversationId: string };
}) {
  assertCan(user, "codecamp:read", tenant);
  const rawDb = db.unscoped("Codecamp chat history is learner-owned and scoped by conversation userId");

  const [conversation] = await rawDb.select().from(codecampChatConversations)
    .where(and(eq(codecampChatConversations.id, input.conversationId), eq(codecampChatConversations.userId, user.id))).limit(1);
  if (!conversation) throw new Error("Conversation not found");

  const messages = await rawDb.select().from(codecampChatMessages)
    .where(eq(codecampChatMessages.conversationId, input.conversationId)).orderBy(codecampChatMessages.createdAt);

  return {
    ...conversation,
    messages: messages.map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content, createdAt: m.createdAt })),
  };
}

/**
 * Lists all chat conversations started by the user.
 */
export async function getUserConversations({
  db, user, tenant,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant;
}) {
  assertCan(user, "codecamp:read", tenant);
  const rawDb = db.unscoped("Codecamp conversation list is learner-owned and scoped by userId");

  return rawDb.select().from(codecampChatConversations)
    .where(eq(codecampChatConversations.userId, user.id))
    .orderBy(desc(codecampChatConversations.updatedAt));
}

/**
 * Fetches module and lesson context for the AI chat system prompt.
 */
export async function getChatContext({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant; input: { moduleId?: string; lessonId?: string };
}) {
  assertCan(user, "codecamp:chat", tenant);
  const rawDb = db.unscoped("Codecamp chat context reads published global curriculum rows");

  let context = "";

  if (input.moduleId) {
    const [mod] = await rawDb.select().from(codecampModules)
      .where(and(eq(codecampModules.id, input.moduleId), eq(codecampModules.status, "published"))).limit(1);
    if (mod) context += `\n\nCurrent module: ${mod.title} — ${mod.description}`;
  }

  if (input.lessonId) {
    const [lesson] = await rawDb.select().from(codecampLessons)
      .where(eq(codecampLessons.id, input.lessonId)).limit(1);
    if (lesson) {
      const [mod] = await rawDb.select({ status: codecampModules.status }).from(codecampModules)
        .where(eq(codecampModules.id, lesson.moduleId)).limit(1);
      if (mod?.status === "published") context += `\nCurrent lesson: ${lesson.title} — ${lesson.description}`;
    }
  }

  return context;
}
