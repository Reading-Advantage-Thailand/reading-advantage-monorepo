import { ROLES, registerDomainModulePermissions } from "@reading-advantage/auth";

/** Permission keys for the teachers module. */
export const TEACHER_PERMISSIONS = {
  READ_OWN: "teachers:read:own",
  SCHOOL_MOVE: "teacher:school:move",
} as const;

registerDomainModulePermissions({
  moduleName: "teachers",
  keys: [{ key: "teacher:school:move", roles: [ROLES.SYSTEM] }],
});
