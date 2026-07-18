import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

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
 * Resolves a legacy credential session to its exact app-local Sales principal.
 * @param database Product database containing durable Sales mappings.
 * @param sourceUserId First-party source user authenticated by the legacy adapter.
 * @returns The mapped company Sales principal, or null when the mapping is absent or revoked.
 */
export async function resolveLegacySalesCompanyPrincipal(
  database: DB,
  sourceUserId: string,
): Promise<ResolvedSalesCompanyPrincipal | null> {
  const parsedSourceUserId = z.string().uuid().safeParse(sourceUserId);
  if (!parsedSourceUserId.success) return null;

  const companyAccountId = parsedSourceUserId.data;
  const localUserId = salesPrincipalLocalId(companyAccountId);
  const mappings = await database
    .select({
      organizationId: companyProductPrincipals.organizationId,
      organizationKey: companyProductPrincipals.organizationKey,
      mappingRole: companyProductPrincipals.roleKey,
      id: users.id,
      username: users.username,
      name: users.name,
      role: users.role,
      schoolId: users.schoolId,
      xp: users.xp,
      level: users.level,
      cefrLevel: users.cefrLevel,
    })
    .from(companyProductPrincipals)
    .innerJoin(users, eq(users.id, companyProductPrincipals.localUserId))
    .where(
      and(
        eq(companyProductPrincipals.applicationKey, "sales"),
        eq(companyProductPrincipals.companyAccountId, companyAccountId),
        eq(companyProductPrincipals.localUserId, localUserId),
        eq(companyProductPrincipals.organizationKey, "internal-company"),
      ),
    )
    .limit(2);

  if (mappings.length !== 1) return null;
  const [mapped] = mappings;
  if (
    !mapped ||
    mapped.schoolId !== null ||
    (mapped.role !== "SALES_REP" && mapped.role !== "SALES_ADMIN") ||
    mapped.mappingRole !== mapped.role
  ) {
    return null;
  }

  return {
    user: {
      id: mapped.id,
      username: mapped.username,
      name: mapped.name,
      role: mapped.role,
      schoolId: null,
      xp: mapped.xp,
      level: mapped.level,
      cefrLevel: mapped.cefrLevel,
    },
    scope: {
      kind: "company",
      applicationKey: "sales",
      organizationId: mapped.organizationId,
      organizationKey: mapped.organizationKey,
    },
  };
}

/**
 * Finds one message through bounded database-adapter error wrappers.
 * @param error Database error or adapter wrapper.
 * @param expected Message fragment owned by the Sales mapping contract.
 * @returns Whether the fragment appears in the bounded cause chain.
 */
function errorChainIncludes(error: unknown, expected: string): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (
      current instanceof Error &&
      current.message.includes(expected)
    ) {
      return true;
    }
    current =
      typeof current === "object" && current !== null && "cause" in current
        ? current.cause
        : undefined;
  }
  return false;
}

/**
 * Resolves an explicit Sales company-account mapping through the constrained
 * database synchronization function.
 * @param database Product database containing local users and durable mappings.
 * @param identity Verified Accounts Sales identity.
 * @returns Existing mapped principal, a newly provisioned principal, or null without a Sales role.
 * @throws When the database rejects an invalid or conflicting mapping transition.
 */
export async function resolveSalesCompanyPrincipal(
  database: DB,
  identity: SalesCompanyIdentity,
): Promise<ResolvedSalesCompanyPrincipal | null> {
  const role = salesRole(identity);
  const localUserId = salesPrincipalLocalId(identity.sub);
  return database.transaction(async (tx) => {
    try {
      await tx.execute(sql`
        SELECT *
        FROM public.sync_sales_company_principal(
          ${identity.organizationId}::uuid,
          ${identity.organizationKey},
          ${identity.sub}::uuid,
          ${identity.displayName},
          ${role ?? "REVOKED"}
        )
      `);
    } catch (error) {
      if (
        errorChainIncludes(
          error,
          "Sales organization change requires an explicit mapping manifest",
        )
      ) {
        throw new Error(
          "Sales principal mapping manifest is required for an existing username or local principal.",
          { cause: error },
        );
      }
      throw error;
    }
    if (!role) return null;

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
      .from(users)
      .where(eq(users.id, localUserId))
      .limit(1);
    if (!mapped || mapped.schoolId !== null) {
      throw new Error("Sales product-local principal synchronization failed.");
    }

    return {
      user: {
        ...mapped,
        username: identity.username,
        name: identity.displayName,
        role,
        schoolId: null,
      },
      scope: {
        kind: "company",
        applicationKey: "sales",
        organizationId: identity.organizationId,
        organizationKey: identity.organizationKey,
      },
    };
  });
}
