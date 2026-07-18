import { and, eq, sql } from "drizzle-orm";

import type {
  ProductAuthorizationScope,
  UserContext,
} from "@reading-advantage/auth";
import {
  companyProductPrincipals,
  users,
  type DB,
} from "@reading-advantage/db";

/** Sales principal paired with its complete verified company boundary. */
export interface ResolvedSalesCompanyPrincipal {
  /** Compatibility user projected into the Sales application. */
  readonly user: UserContext;
  /** Complete company boundary accepted by Sales authorization. */
  readonly scope: ProductAuthorizationScope & {
    readonly kind: "company";
    readonly applicationKey: "sales";
  };
}

/** Minimal verified Accounts identity required to resolve a Sales principal. */
export interface SalesCompanyIdentity {
  /** Stable company account identifier. */
  readonly sub: string;
  /** Exact product audience. */
  readonly aud: string;
  /** Stable verified company organization identifier. */
  readonly organizationId: string;
  /** Canonical verified company organization key. */
  readonly organizationKey: string;
  /** First-party company username used only when provisioning a new local row. */
  readonly username: string;
  /** First-party display name used only when provisioning a new local row. */
  readonly displayName: string;
  /** Audience-scoped role claims. */
  readonly roles: readonly string[];
}

/**
 * Builds the product-local compatibility user ID for a Sales account.
 * @param companyAccountId Stable Accounts subject.
 * @returns Namespaced Sales-local principal ID.
 */
export function salesPrincipalLocalId(companyAccountId: string): string {
  return `sales:${companyAccountId}`;
}

function salesRole(
  identity: SalesCompanyIdentity,
): "SALES_ADMIN" | "SALES_REP" | null {
  if (identity.aud !== "sales")
    throw new Error("Sales identity audience is invalid.");
  if (identity.organizationKey !== "internal-company") {
    throw new Error("Sales identity organization is invalid.");
  }
  if (identity.roles.includes("SALES_ADMIN")) return "SALES_ADMIN";
  if (identity.roles.includes("SALES_REP")) return "SALES_REP";
  return null;
}

/**
 * Detects a PostgreSQL unique violation through bounded adapter error wrappers.
 * @param error Database error or wrapper returned by Drizzle.
 * @returns Whether the error chain contains SQLSTATE 23505.
 */
function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current; depth += 1) {
    if (
      typeof current === "object" &&
      "code" in current &&
      current.code === "23505"
    ) {
      return true;
    }
    current =
      typeof current === "object" && "cause" in current
        ? current.cause
        : undefined;
  }
  return false;
}

/**
 * Resolves an explicit Sales company-account mapping without heuristic merging.
 * @param database Product database containing local users and durable mappings.
 * @param identity Verified Accounts Sales identity.
 * @returns Existing mapped principal, a newly provisioned principal, or null without a Sales role.
 * @throws When an existing local ID or username requires an operator mapping manifest.
 */
export async function resolveSalesCompanyPrincipal(
  database: DB,
  identity: SalesCompanyIdentity,
): Promise<ResolvedSalesCompanyPrincipal | null> {
  const role = salesRole(identity);
  return database.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`sales:${identity.sub}`}, 0))`,
    );
    const [mapped] = await tx
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        schoolId: users.schoolId,
        xp: users.xp,
        level: users.level,
        cefrLevel: users.cefrLevel,
      })
      .from(companyProductPrincipals)
      .innerJoin(users, eq(users.id, companyProductPrincipals.localUserId))
      .where(
        and(
          eq(companyProductPrincipals.organizationId, identity.organizationId),
          eq(
            companyProductPrincipals.organizationKey,
            identity.organizationKey,
          ),
          eq(companyProductPrincipals.companyAccountId, identity.sub),
          eq(companyProductPrincipals.applicationKey, "sales"),
        ),
      )
      .limit(1);
    if (mapped) {
      await tx
        .update(users)
        .set({
          role: role ?? "INTERN",
          ...(role ? { name: identity.displayName } : {}),
        })
        .where(eq(users.id, mapped.id));
      await tx
        .update(companyProductPrincipals)
        .set({ roleKey: role ?? "REVOKED", updatedAt: new Date() })
        .where(
          and(
            eq(
              companyProductPrincipals.organizationId,
              identity.organizationId,
            ),
            eq(
              companyProductPrincipals.organizationKey,
              identity.organizationKey,
            ),
            eq(companyProductPrincipals.companyAccountId, identity.sub),
            eq(companyProductPrincipals.applicationKey, "sales"),
          ),
        );
      if (!role) return null;
      return {
        user: {
          ...mapped,
          username: identity.username,
          name: identity.displayName,
          role,
        },
        scope: {
          kind: "company",
          applicationKey: "sales",
          organizationId: identity.organizationId,
          organizationKey: identity.organizationKey,
        },
      };
    }
    if (!role) return null;

    const localUserId = salesPrincipalLocalId(identity.sub);
    try {
      const [created] = await tx
        .insert(users)
        .values({
          id: localUserId,
          username: localUserId,
          displayUsername: localUserId,
          name: identity.displayName,
          role,
          schoolId: null,
          xp: 0,
          level: 1,
          cefrLevel: "N/A",
        })
        .returning({
          id: users.id,
          username: users.username,
          name: users.name,
          schoolId: users.schoolId,
          xp: users.xp,
          level: users.level,
          cefrLevel: users.cefrLevel,
        });
      if (!created) throw new Error("Sales principal provisioning failed.");
      await tx.insert(companyProductPrincipals).values({
        organizationId: identity.organizationId,
        organizationKey: identity.organizationKey,
        companyAccountId: identity.sub,
        applicationKey: "sales",
        localUserId: created.id,
        roleKey: role,
      });
      return {
        user: {
          ...created,
          username: identity.username,
          name: identity.displayName,
          role,
        },
        scope: {
          kind: "company",
          applicationKey: "sales",
          organizationId: identity.organizationId,
          organizationKey: identity.organizationKey,
        },
      };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new Error(
          "Sales principal mapping manifest is required for an existing username or local principal.",
        );
      }
      throw error;
    }
  });
}
