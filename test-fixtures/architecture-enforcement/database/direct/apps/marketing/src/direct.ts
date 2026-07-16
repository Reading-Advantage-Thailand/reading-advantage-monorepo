import { db } from "@reading-advantage/db";

/** Direct database client leaked into a product app. */
export const directDatabase = db;
