import { pgTable, uuid, text, timestamp, integer, real, unique } from "drizzle-orm/pg-core";

// ─── RA-CEFR Level Mappings (PORT-AS-IS) ─────────────────────────────────────

export const raCefrMappings = pgTable("ra_cefr_mappings", {
  id: uuid("id").primaryKey().defaultRandom(),
  raLevel: integer("ra_level").notNull().unique(),
  cefrLevel: text("cefr_level").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Genre Adjacency (PORT-AS-IS) ────────────────────────────────────────────

export const genreAdjacencies = pgTable("genre_adjacencies", {
  id: uuid("id").primaryKey().defaultRandom(),
  primaryGenre: text("primary_genre").notNull(),
  adjacentGenre: text("adjacent_genre").notNull(),
  weight: real("weight").default(1.0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("genre_adjacencies_primary_adjacent_unique").on(table.primaryGenre, table.adjacentGenre),
]);
