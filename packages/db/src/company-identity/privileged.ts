import { createCompanyIdentityDirectClient } from "./client.js";

interface DatabaseRoleSafety {
  readonly bypassRls: boolean;
  readonly canCreateDatabase: boolean;
  readonly canCreateRole: boolean;
  readonly hasMemberships: boolean;
  readonly inheritsPrivileges: boolean;
  readonly replication: boolean;
  readonly roleName: string;
  readonly superuser: boolean;
}

/**
 * Quotes a reviewed lowercase PostgreSQL role identifier.
 * @param role The role name to validate and quote.
 * @returns The safely quoted PostgreSQL identifier.
 * @throws When the role name is not a bounded lowercase PostgreSQL identifier.
 */
function quoteRole(role: string): string {
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(role)) {
    throw new Error(`Unsafe PostgreSQL role name: ${role}`);
  }
  return `"${role}"`;
}

/**
 * Determines whether a database role satisfies the non-inheriting login boundary.
 * @param role The catalog projection for a runtime or migration role.
 * @returns Whether the role has no cluster authority or inherited membership.
 */
function isLeastPrivilegeRole(role: DatabaseRoleSafety): boolean {
  return !(
    role.bypassRls ||
    role.canCreateDatabase ||
    role.canCreateRole ||
    role.hasMemberships ||
    role.inheritsPrivileges ||
    role.replication ||
    role.superuser
  );
}

/**
 * Applies least-privilege grants for company identity runtime and migration roles.
 * @param input Migration-owner database URL plus the runtime and migration role names.
 * @returns A promise that resolves after current and future identity objects are secured.
 * @throws When roles overlap, inherit authority, violate ownership, or grant normalization fails.
 */
export async function configureCompanyIdentityDatabasePrivileges(input: {
  readonly databaseUrl: string;
  readonly runtimeRole: string;
  readonly migrationRole: string;
}): Promise<void> {
  if (input.runtimeRole === input.migrationRole) {
    throw new Error(
      "Company identity runtime and migration database roles must be separate.",
    );
  }
  const runtimeRole = quoteRole(input.runtimeRole);
  const migrationRole = quoteRole(input.migrationRole);
  const sql = await createCompanyIdentityDirectClient({
    directDatabaseUrl: input.databaseUrl,
    expectedRole: input.migrationRole,
  });
  try {
    const roles = await sql<
      Array<{
        bypass_rls: boolean;
        can_create_database: boolean;
        can_create_role: boolean;
        has_memberships: boolean;
        inherits_privileges: boolean;
        replication: boolean;
        role_name: string;
        superuser: boolean;
      }>
    >`
      select
        role.rolbypassrls as bypass_rls,
        role.rolcreatedb as can_create_database,
        role.rolcreaterole as can_create_role,
        exists(
          select 1 from pg_catalog.pg_auth_members membership
           where membership.member = role.oid
        ) as has_memberships,
        role.rolinherit as inherits_privileges,
        role.rolreplication as replication,
        role.rolname as role_name,
        role.rolsuper as superuser
      from pg_catalog.pg_roles role
      where role.rolname = ${input.runtimeRole}
         or role.rolname = ${input.migrationRole}
      order by role.rolname
    `;
    const inspectedRoles: DatabaseRoleSafety[] = roles.map((role) => ({
      bypassRls: role.bypass_rls,
      canCreateDatabase: role.can_create_database,
      canCreateRole: role.can_create_role,
      hasMemberships: role.has_memberships,
      inheritsPrivileges: role.inherits_privileges,
      replication: role.replication,
      roleName: role.role_name,
      superuser: role.superuser,
    }));
    if (
      inspectedRoles.length !== 2 ||
      inspectedRoles.some((role) => !isLeastPrivilegeRole(role))
    ) {
      throw new Error(
        "Company identity database roles must be non-inheriting, membership-free, and free of cluster privileges.",
      );
    }

    await sql.begin(async (tx) => {
      await tx.unsafe("REVOKE CREATE ON SCHEMA public FROM PUBLIC");
      await tx.unsafe(
        `REVOKE ALL PRIVILEGES ON SCHEMA public FROM ${runtimeRole}`,
      );
      await tx.unsafe(`GRANT USAGE ON SCHEMA public TO ${runtimeRole}`);
      await tx.unsafe(
        `GRANT USAGE, CREATE ON SCHEMA public TO ${migrationRole}`,
      );
      await tx.unsafe(
        `REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM ${runtimeRole}`,
      );
      await tx.unsafe(
        `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${runtimeRole}`,
      );
      await tx.unsafe(
        `REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.company_identity_audit_events FROM ${runtimeRole}`,
      );
      await tx.unsafe(
        `REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.company_login_attempts FROM ${runtimeRole}`,
      );
      await tx.unsafe(
        `REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM ${runtimeRole}`,
      );
      await tx.unsafe(
        `GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ${runtimeRole}`,
      );
      await tx.unsafe(
        `ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationRole} IN SCHEMA public REVOKE ALL ON TABLES FROM ${runtimeRole}`,
      );
      await tx.unsafe(
        `ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationRole} IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${runtimeRole}`,
      );
      await tx.unsafe(
        `ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationRole} IN SCHEMA public REVOKE ALL ON SEQUENCES FROM ${runtimeRole}`,
      );
      await tx.unsafe(
        `ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationRole} IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ${runtimeRole}`,
      );
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}
