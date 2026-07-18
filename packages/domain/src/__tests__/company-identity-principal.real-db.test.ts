// @vitest-environment node
import { randomUUID } from "node:crypto";

import { and, count, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  companyProductPrincipals,
  db,
  users,
} from "@reading-advantage/db";

import { resolveSalesCompanyPrincipal } from "../company-identity-principal.js";

const describeRealDatabase = process.env.RUN_SALES_MAPPING_REAL_DB_TESTS === "true"
  ? describe
  : describe.skip;

function hasSqlState(error: unknown, code: string): boolean {
  let current = error;
  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (typeof current === "object" && "code" in current && current.code === code) {
      return true;
    }
    current = typeof current === "object" && "cause" in current
      ? current.cause
      : undefined;
  }
  return false;
}

describeRealDatabase("Sales company principal mapping (real PostgreSQL)", () => {
  it("proves concurrent first login, conflicts, org/role denial, and role synchronization", async () => {
    const organizationId = randomUUID();
    const sub = randomUUID();
    const username = `company.rep.${randomUUID().slice(0, 8)}`;
    const identity = {
      sub,
      aud: "sales",
      organizationId,
      organizationKey: "internal-company",
      username,
      displayName: "Company Rep",
      roles: ["SALES_REP"],
    } as const;

    const concurrent = await Promise.all([
      resolveSalesCompanyPrincipal(db, identity),
      resolveSalesCompanyPrincipal(db, identity),
    ]);
    expect(concurrent.map((principal) => principal?.user.id)).toEqual([sub, sub]);
    await expect(resolveSalesCompanyPrincipal(db, identity)).resolves
      .toMatchObject({ user: { id: sub, role: "SALES_REP" } });

    const [userCount] = await db.select({ value: count() }).from(users)
      .where(eq(users.id, sub));
    const [mappingCount] = await db.select({ value: count() })
      .from(companyProductPrincipals)
      .where(and(
        eq(companyProductPrincipals.organizationId, organizationId),
        eq(companyProductPrincipals.companyAccountId, sub),
        eq(companyProductPrincipals.applicationKey, "sales"),
      ));
    expect(userCount?.value).toBe(1);
    expect(mappingCount?.value).toBe(1);

    await expect(resolveSalesCompanyPrincipal(db, {
      ...identity,
      organizationId: randomUUID(),
    })).rejects.toThrow("mapping is required");
    const [mappingCountAfterOrganizationIdMismatch] = await db
      .select({ value: count() })
      .from(companyProductPrincipals);
    expect(mappingCountAfterOrganizationIdMismatch?.value).toBe(1);

    await expect(resolveSalesCompanyPrincipal(db, {
      ...identity,
      organizationId: randomUUID(),
      organizationKey: "other-company",
    })).rejects.toThrow("organization is invalid");

    const occupiedUsername = `occupied.${randomUUID().slice(0, 8)}`;
    const occupiedUsernameId = `legacy-${randomUUID()}`;
    await db.insert(users).values({
      id: occupiedUsernameId,
      username: occupiedUsername,
      displayUsername: occupiedUsername,
      role: "SALES_REP",
    });
    const usernameConflictSub = randomUUID();
    await expect(resolveSalesCompanyPrincipal(db, {
      ...identity,
      sub: usernameConflictSub,
      username: occupiedUsername,
    })).rejects.toThrow("mapping manifest is required");
    await expect(db.select({ id: users.id }).from(users)
      .where(eq(users.id, usernameConflictSub))).resolves.toEqual([]);

    const occupiedId = randomUUID();
    const occupiedIdUsername = `occupied-id.${randomUUID().slice(0, 8)}`;
    await db.insert(users).values({
      id: occupiedId,
      username: occupiedIdUsername,
      displayUsername: occupiedIdUsername,
      role: "SALES_REP",
    });
    await expect(resolveSalesCompanyPrincipal(db, {
      ...identity,
      sub: occupiedId,
      username: `different.${randomUUID().slice(0, 8)}`,
    })).rejects.toThrow("mapping is required");

    await expect(resolveSalesCompanyPrincipal(db, {
      ...identity,
      roles: ["SALES_ADMIN"],
    })).resolves.toMatchObject({ user: { role: "SALES_ADMIN" } });
    await expect(resolveSalesCompanyPrincipal(db, identity)).resolves
      .toMatchObject({ user: { role: "SALES_REP" } });
    const [synchronized] = await db.select({
      userRole: users.role,
      mappingRole: companyProductPrincipals.roleKey,
    }).from(companyProductPrincipals)
      .innerJoin(users, eq(users.id, companyProductPrincipals.localUserId))
      .where(and(
        eq(companyProductPrincipals.organizationId, organizationId),
        eq(companyProductPrincipals.companyAccountId, sub),
      ));
    expect(synchronized).toEqual({
      userRole: "SALES_REP",
      mappingRole: "SALES_REP",
    });

    await expect(resolveSalesCompanyPrincipal(db, {
      ...identity,
      roles: [],
    })).resolves.toBeNull();
    const [afterRemoval] = await db.select({
      userRole: users.role,
      mappingRole: companyProductPrincipals.roleKey,
    }).from(companyProductPrincipals)
      .innerJoin(users, eq(users.id, companyProductPrincipals.localUserId))
      .where(and(
        eq(companyProductPrincipals.organizationId, organizationId),
        eq(companyProductPrincipals.companyAccountId, sub),
      ));
    expect(afterRemoval).toEqual({
      userRole: "INTERN",
      mappingRole: "REVOKED",
    });

    await expect(resolveSalesCompanyPrincipal(db, identity)).resolves
      .toMatchObject({ user: { role: "SALES_REP" } });

    let duplicateError: unknown;
    try {
      await db.insert(companyProductPrincipals).values({
        organizationId: randomUUID(),
        organizationKey: "internal-company",
        companyAccountId: randomUUID(),
        applicationKey: "sales",
        localUserId: sub,
        roleKey: "SALES_REP",
      });
    } catch (error) {
      duplicateError = error;
    }
    expect(hasSqlState(duplicateError, "23505")).toBe(true);
  });
});
