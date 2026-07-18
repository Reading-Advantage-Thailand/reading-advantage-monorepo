import { createHmac } from "node:crypto";

import type postgres from "postgres";

import type { CompanyLoginRateLimitPort } from "./service.js";

function identifierHash(key: Buffer, value: string): string {
  return createHmac("sha256", key).update(value).digest("hex");
}

/**
 * Creates a replica-safe PostgreSQL login rate-limit adapter.
 * @param input Identity connection and keyed-hash secret.
 * @returns Persistent username and IP limit adapter.
 */
export function createPostgresCompanyLoginRateLimit(input: {
  readonly sql: postgres.Sql;
  readonly identifierHashKey: string;
}): CompanyLoginRateLimitPort {
  const key = Buffer.from(input.identifierHashKey, "base64url");
  if (key.byteLength < 32 || key.toString("base64url") !== input.identifierHashKey) {
    throw new Error("COMPANY_AUTH_IDENTIFIER_HASH_KEY_INVALID");
  }
  const usernameHash = (username: string) =>
    identifierHash(key, username.normalize("NFKC").trim().toLowerCase());
  const ipHash = (ipAddress: string) => identifierHash(key, ipAddress.trim());

  const adapter: CompanyLoginRateLimitPort = {
    async check(request) {
      const rows = await input.sql<Array<{ blocked_until: Date | null }>>`
        select blocked_until
        from company_login_rate_limit_buckets
        where (kind = 'USERNAME' and identifier_hash = ${usernameHash(request.username)})
           or (kind = 'IP' and identifier_hash = ${ipHash(request.ipAddress)})
      `;
      return rows.every(
        (row) => row.blocked_until === null || row.blocked_until <= request.now,
      );
    },
    async recordFailure(request) {
      await input.sql.begin(async (transaction) => {
        for (const bucket of [
          { kind: "USERNAME", hash: usernameHash(request.username), threshold: 5 },
          { kind: "IP", hash: ipHash(request.ipAddress), threshold: 30 },
        ] as const) {
          const windowStart = new Date(request.now.getTime() - 15 * 60_000);
          await transaction`
            insert into company_login_rate_limit_buckets (
              kind, identifier_hash, failed_count, window_started_at,
              last_attempt_at, blocked_until, updated_at
            ) values (
              ${bucket.kind}, ${bucket.hash}, 1, ${request.now}, ${request.now}, null, ${request.now}
            ) on conflict (kind, identifier_hash) do update set
              failed_count = case
                when company_login_rate_limit_buckets.window_started_at <= ${windowStart}
                  then 1
                else company_login_rate_limit_buckets.failed_count + 1
              end,
              window_started_at = case
                when company_login_rate_limit_buckets.window_started_at <= ${windowStart}
                  then ${request.now}
                else company_login_rate_limit_buckets.window_started_at
              end,
              last_attempt_at = ${request.now},
              blocked_until = case
                when (case
                  when company_login_rate_limit_buckets.window_started_at <= ${windowStart}
                    then 1
                  else company_login_rate_limit_buckets.failed_count + 1
                end) >= ${bucket.threshold}
                  then ${new Date(request.now.getTime() + 15 * 60_000)}
                else company_login_rate_limit_buckets.blocked_until
              end,
              updated_at = ${request.now}
          `;
        }
      });
    },
    async recordSuccess(request) {
      await input.sql`
        delete from company_login_rate_limit_buckets
        where kind = 'USERNAME' and identifier_hash = ${usernameHash(request.username)}
      `;
    },
  };
  return Object.freeze(adapter);
}
