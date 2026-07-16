import { users } from "@fixture/db-alias";

/** Database table leaked through a TypeScript path alias. */
export const salesUsersTable = users;
