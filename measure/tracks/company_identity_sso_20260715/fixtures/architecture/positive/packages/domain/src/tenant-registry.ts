import { companyAccounts } from "@reading-advantage/db/company-identity";

declare function register(table: unknown, classification: "EXEMPT"): void;

register(companyAccounts, "EXEMPT");
