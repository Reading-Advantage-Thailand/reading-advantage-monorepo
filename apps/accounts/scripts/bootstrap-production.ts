import { createHash, randomUUID } from "node:crypto";

import { hashPassword, verifyPassword } from "@reading-advantage/auth";
import { createCompanyIdentityDirectClient } from "@reading-advantage/db/company-identity";

import { createProductionBootstrapInput } from "./bootstrap-contract";

function normalizedUsername(value: string): string {
  const normalized = value.normalize("NFKC").trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/.test(normalized)) {
    throw new Error("Bootstrap owner username is invalid.");
  }
  return normalized;
}

function deterministicUuid(name: string): string {
  const bytes = createHash("sha256").update(name).digest().subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function main(): Promise<void> {
  const input = createProductionBootstrapInput(process.env);
  const sql = await createCompanyIdentityDirectClient({
    directDatabaseUrl: input.directDatabaseUrl,
  });
  try {
    await sql.begin(async (transaction) => {
      const normalized = normalizedUsername(input.ownerUsername);
      const [organization] = await transaction<Array<{ id: string }>>`
        select id from company_organizations where stable_key = 'internal-company' and status = 'ACTIVE'
      `;
      if (!organization) throw new Error("Company identity bootstrap records are missing.");
      const [existing] = await transaction<Array<{ id: string }>>`
        select id from company_accounts where normalized_username = ${normalized} for update
      `;
      const ownerId = existing?.id ?? deterministicUuid(`accounts-owner:${normalized}`);
      if (!existing) {
        const passwordHash = await hashPassword(input.ownerPassword);
        await transaction`
          insert into company_accounts (
            id, username, normalized_username, normalization_version, display_name, status
          ) values (${ownerId}, ${input.ownerUsername.normalize("NFKC").trim()}, ${normalized}, 1, ${input.ownerDisplayName}, 'ACTIVE')
        `;
        await transaction`
          insert into company_password_credentials (account_id, password_hash, algorithm)
          values (${ownerId}, ${passwordHash}, 'ARGON2ID')
        `;
      } else {
        const [credential] = await transaction<Array<{ password_hash: string }>>`
          select password_hash from company_password_credentials where account_id = ${ownerId}
        `;
        if (!credential || !(await verifyPassword(input.ownerPassword, credential.password_hash))) {
          throw new Error("Bootstrap owner exists with different credentials; use the audited reset workflow.");
        }
      }
      const [membership] = await transaction<Array<{ id: string }>>`
        insert into company_organization_memberships (organization_id, account_id, status)
        values (${organization.id}, ${ownerId}, 'ACTIVE')
        on conflict (organization_id, account_id) do update set status = 'ACTIVE', updated_at = now()
        returning id
      `;
      if (!membership) throw new Error("Bootstrap owner membership could not be created.");
      for (const role of ["EMPLOYEE", "COMPANY_ADMIN"] as const) {
        await transaction`
          insert into company_role_assignments (
            organization_id, membership_id, role_key, assigned_by_account_id
          ) values (${organization.id}, ${membership.id}, ${role}, ${ownerId})
          on conflict (membership_id, role_key) do nothing
        `;
      }
      const ownerApplicationRoles = [
        { applicationKey: "marketing", roleKey: "ADMIN" },
        { applicationKey: "sales", roleKey: "SALES_ADMIN" },
        { applicationKey: "codecamp", roleKey: "ADMIN" },
      ] as const;
      for (const assignment of ownerApplicationRoles) {
        const [application] = await transaction<Array<{ id: string }>>`
          select id from company_applications
           where stable_key = ${assignment.applicationKey} and status = 'ACTIVE'
        `;
        if (!application) throw new Error(`Bootstrap application is missing: ${assignment.applicationKey}`);
        const [definition] = await transaction<Array<{ exists: boolean }>>`
          select exists(
            select 1 from company_application_role_definitions
             where application_id = ${application.id}
               and role_key = ${assignment.roleKey} and status = 'ACTIVE'
          ) as exists
        `;
        if (!definition?.exists) throw new Error(
          `Bootstrap role is missing: ${assignment.applicationKey}:${assignment.roleKey}`,
        );
        await transaction`
          insert into company_application_role_assignments (
            organization_id, membership_id, application_id, role_key,
            assigned_by_account_id
          ) values (
            ${organization.id}, ${membership.id}, ${application.id},
            ${assignment.roleKey}, ${ownerId}
          ) on conflict (membership_id, application_id, role_key) do nothing
        `;
      }
      const [ownerAudit] = await transaction<Array<{ exists: boolean }>>`
        select exists(select 1 from company_identity_audit_events
          where operation = 'identity:bootstrap-owner' and target_account_id = ${ownerId}) as exists
      `;
      if (!ownerAudit?.exists) {
        await transaction`
          insert into company_identity_audit_events (
            correlation_id, actor_type, target_account_id, organization_id,
            operation, outcome, metadata
          ) values (${randomUUID()}, 'SYSTEM', ${ownerId}, ${organization.id},
            'identity:bootstrap-owner', 'SUCCEEDED', ${transaction.json({ source: "accounts-bootstrap", normalizationVersion: 1 })})
        `;
      }

      for (const client of input.clients) {
        const [application] = await transaction<Array<{ id: string }>>`
          select id from company_applications where stable_key = ${client.applicationKey} and status = 'ACTIVE'
        `;
        if (!application) throw new Error(`Bootstrap application is missing: ${client.applicationKey}`);
        const [existingClient] = await transaction<Array<{ id: string; client_secret_hash: string }>>`
          select id, client_secret_hash from company_oidc_clients where client_id = ${client.clientId} for update
        `;
        let clientRowId = existingClient?.id;
        if (existingClient) {
          if (!(await verifyPassword(client.clientSecret, existingClient.client_secret_hash))) {
            throw new Error(`OIDC client ${client.clientId} exists with a different secret; use explicit rotation.`);
          }
        } else {
          const [created] = await transaction<Array<{ id: string }>>`
            insert into company_oidc_clients (
              application_id, client_id, client_type, token_auth_method,
              client_secret_hash, pkce_required, status
            ) values (${application.id}, ${client.clientId}, 'CONFIDENTIAL',
              'CLIENT_SECRET_BASIC', ${await hashPassword(client.clientSecret)}, true, 'ACTIVE')
            returning id
          `;
          clientRowId = created?.id;
        }
        if (!clientRowId) throw new Error(`OIDC client could not be created: ${client.clientId}`);
        const redirects = await transaction<Array<{ redirect_uri: string }>>`
          select redirect_uri from company_oidc_redirect_uris where oidc_client_id = ${clientRowId}
        `;
        if (redirects.some((row) => row.redirect_uri !== client.redirectUri)) {
          throw new Error(`OIDC client ${client.clientId} has an unexpected callback; use explicit rotation.`);
        }
        await transaction`
          insert into company_oidc_redirect_uris (oidc_client_id, redirect_uri)
          values (${clientRowId}, ${client.redirectUri})
          on conflict (oidc_client_id, redirect_uri) do nothing
        `;
        const [clientAudit] = await transaction<Array<{ exists: boolean }>>`
          select exists(select 1 from company_identity_audit_events
            where operation = 'identity:bootstrap-client' and application_id = ${application.id}
              and metadata->>'clientId' = ${client.clientId}) as exists
        `;
        if (!clientAudit?.exists) {
          await transaction`
            insert into company_identity_audit_events (
              correlation_id, actor_type, organization_id, application_id,
              operation, outcome, metadata
            ) values (${randomUUID()}, 'SYSTEM', ${organization.id}, ${application.id},
              'identity:bootstrap-client', 'SUCCEEDED',
              ${transaction.json({ source: "accounts-bootstrap", clientId: client.clientId })})
          `;
        }
      }
    });
    process.stdout.write("Accounts bootstrap verified: owner=1 owner_app_admin_roles=3 clients=3 audit=immutable\n");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

await main();
