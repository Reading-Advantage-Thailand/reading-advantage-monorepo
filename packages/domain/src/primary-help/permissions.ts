import { ROLES, registerDomainModulePermissions } from "@reading-advantage/auth";

/** The permission to record a help event: the roles that see the help button. */
export const HELP_EVENT_RECORD = "primary:help-event:record";
/** The permission to read the help report: SYSTEM only (spec FR-12). */
export const HELP_REPORT_READ = "primary:help-report:read";

registerDomainModulePermissions({
  moduleName: "primary-help",
  keys: [
    { key: HELP_EVENT_RECORD, roles: [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN] },
    { key: HELP_REPORT_READ, roles: [ROLES.SYSTEM] },
  ],
});
