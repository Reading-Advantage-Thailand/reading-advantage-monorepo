import {
  createStorytimeRuntimeStore,
  type StorytimeStore,
} from "@reading-advantage/backend/storytime-access";

/**
 * The store of the Storytime app (design section 5a, AC-4.12).
 *
 * This module is the only place in the app that reads `STORYTIME_DATABASE_URL`. The app may not
 * import a database driver, so the client and every SQL statement live in
 * `@reading-advantage/backend/storytime-access`. The store is created once per process, on the
 * first call, so an import opens no connection.
 */

/** The environment value that holds the Storytime database URL. */
export const DATABASE_URL_ENV = "STORYTIME_DATABASE_URL";

/** The store of this process. */
let store: StorytimeStore | null = null;

/**
 * Gives the store of this process.
 * @returns The store, created on the first call.
 * @throws When the environment holds no database URL.
 */
export function getStore(): StorytimeStore {
  if (store !== null) return store;
  const databaseUrl = process.env[DATABASE_URL_ENV];
  if (!databaseUrl) throw new Error(`${DATABASE_URL_ENV} is required`);
  store = createStorytimeRuntimeStore(databaseUrl);
  return store;
}
