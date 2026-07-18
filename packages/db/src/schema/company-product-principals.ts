import { sql } from "drizzle-orm";
import {
  check,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  pgTable,
} from "drizzle-orm/pg-core";

import { users } from "./users.js";

/** Durable explicit mapping from one company account to one local product principal. */
export const companyProductPrincipals = pgTable(
  "company_product_principals",
  {
    organizationId: uuid("organization_id").notNull(),
    organizationKey: text("organization_key").notNull(),
    companyAccountId: uuid("company_account_id").notNull(),
    applicationKey: text("application_key").notNull(),
    localUserId: text("local_user_id").notNull().references(() => users.id, {
      onDelete: "restrict",
    }),
    roleKey: text("role_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.organizationId, table.companyAccountId, table.applicationKey],
    }),
    unique("company_product_principals_application_local_unique").on(
      table.organizationId,
      table.applicationKey,
      table.localUserId,
    ),
    check(
      "company_product_principals_organization_key_check",
      sql`${table.organizationKey} ~ '^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$'`,
    ),
    check(
      "company_product_principals_application_key_check",
      sql`${table.applicationKey} ~ '^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$'`,
    ),
    check(
      "company_product_principals_role_key_check",
      sql`${table.roleKey} ~ '^[A-Z][A-Z0-9_]{0,63}$'`,
    ),
  ],
);
