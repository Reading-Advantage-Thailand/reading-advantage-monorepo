/** Runtime-only accounting database client without migration tooling. */
export { createAccountingRuntimeClient } from "./client.js";
export {
  accountingRuntimeEnvSchema,
  createAccountingRuntimeConfig,
  type AccountingRuntimeConfig,
} from "./environment.js";
