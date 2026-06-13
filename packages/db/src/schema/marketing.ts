import { pgTable, uuid, text, timestamp, jsonb, pgEnum, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ──────────────────────────────────────────────

export const campaignTypeEnum = pgEnum("campaign_type", ["video", "infocard"]);
export const campaignStatusEnum = pgEnum("campaign_status", ["draft", "in-progress", "complete", "archived"]);
export const appEnum = pgEnum("app", [
  "reading-advantage",
  "primary-advantage",
  "storytime",
  "math-advantage",
  "science-advantage",
  "stem-advantage",
  "zhongwen-advantage",
  "tutor-advantage",
]);
export const assetTypeEnum = pgEnum("asset_type", ["image", "voiceover", "clip"]);
export const assetStatusEnum = pgEnum("asset_status", ["pending", "generated", "approved", "rejected"]);
export const videoProjectStatusEnum = pgEnum("video_project_status", ["draft", "in-progress", "complete"]);

// ─── Campaigns ──────────────────────────────────────────

export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: campaignTypeEnum("type").notNull(),
  app: appEnum("app").notNull(),
  name: text("name").notNull(),
  status: campaignStatusEnum("status").default("draft").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("campaigns_app_idx").on(table.app),
  index("campaigns_status_idx").on(table.status),
]);

// ─── Video Projects ─────────────────────────────────────

export const videoProjects = pgTable("video_projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  topic: text("topic").notNull(),
  script: jsonb("script"), // JSON array of scenes
  status: videoProjectStatusEnum("status").default("draft").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("video_projects_campaign_idx").on(table.campaignId),
]);

// ─── Video Assets ───────────────────────────────────────

export const videoAssets = pgTable("video_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => videoProjects.id, { onDelete: "cascade" }),
  sceneIndex: text("scene_index").notNull(),
  type: assetTypeEnum("type").notNull(),
  url: text("url"),
  prompt: text("prompt"),
  status: assetStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("video_assets_project_idx").on(table.projectId),
]);

// ─── Past Topics ────────────────────────────────────────

export const pastTopics = pgTable("past_topics", {
  id: uuid("id").primaryKey().defaultRandom(),
  app: appEnum("app").notNull(),
  topic: text("topic").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("past_topics_app_idx").on(table.app),
]);

// ─── Settings ───────────────────────────────────────────

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(), // encrypted at rest
});

// ─── Relations ──────────────────────────────────────────

export const campaignsRelations = relations(campaigns, ({ many }) => ({
  videoProjects: many(videoProjects),
}));

export const videoProjectsRelations = relations(videoProjects, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [videoProjects.campaignId],
    references: [campaigns.id],
  }),
  videoAssets: many(videoAssets),
}));

export const videoAssetsRelations = relations(videoAssets, ({ one }) => ({
  project: one(videoProjects, {
    fields: [videoAssets.projectId],
    references: [videoProjects.id],
  }),
}));
