import {
  companyAccounts,
  createCompanyIdentityRuntimeClient,
} from "@reading-advantage/db/company-identity";

/** Exact approved PostgreSQL adapter-root fixture. */
export const allowedIdentityAdapterImports = {
  createCompanyIdentityRuntimeClient,
  companyAccounts,
};
