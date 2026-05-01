import { User as NextAuthUser } from "next-auth";
import { JWT as NextAuthJWT } from "next-auth/jwt";
import { Role, LicenseType } from "@prisma/client";

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    display_name: string;
    role: Role;
    level: number;
    email_verified: boolean;
    picture: string;
    xp: number;
    cefr_level: string;
    expired_date: string;
    expired?: boolean;
    license_id?: string;
    license_level: LicenseType | "EXPIRED";
    onborda: boolean;
    // School and classroom scope for RBAC
    school_id?: string;
    teacher_class_ids?: string[];
    student_class_ids?: string[];
  }
}

declare module "next-auth" {
  interface Session {
    user: User & {
      id: string;
      email: string;
      display_name: string;
      role: Role;
      level: number;
      email_verified: boolean;
      picture: string;
      xp: number;
      cefr_level: string;
      expired_date: string;
      expired?: boolean;
      license_id?: string;
      license_level: LicenseType | "EXPIRED";
      onborda: boolean;
      // School and classroom scope for RBAC
      school_id?: string;
      teacher_class_ids?: string[];
      student_class_ids?: string[];
    };
  }

  interface User {
    id: string;
    email: string;
    display_name: string;
    role: Role;
    level: number;
    email_verified: boolean;
    picture: string;
    xp: number;
    cefr_level: string;
    expired_date: string;
    expired?: boolean;
    license_id?: string;
    license_level: LicenseType | "EXPIRED";
    onborda: boolean;
    // School and classroom scope for RBAC
    school_id?: string;
    teacher_class_ids?: string[];
    student_class_ids?: string[];
  }
}
