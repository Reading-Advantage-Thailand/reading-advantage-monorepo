import { createCompanyIdentityDirectClient } from "./client.js";
import * as companyIdentitySchema from "./schema/index.js";

/** DB-owned migration fixture allowed to use identity internals. */
export const allowedMigrationImports = {
  createCompanyIdentityDirectClient,
  companyIdentitySchema,
};
