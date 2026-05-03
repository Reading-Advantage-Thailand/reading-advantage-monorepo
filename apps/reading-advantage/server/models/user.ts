import { Role } from "./enum";

export interface User {
  id: string;
  email: string;
  display_name: string;
  role: Role;
  created_at: string; // ISO string
  updated_at: string; // ISO string
  level: number;
  email_verified: boolean;
  picture: string;
  xp: number;
  cefr_level: string;
  sign_in_provider?: string;
  expired_date: string;
  expired: boolean;
  license_id?: string;
  onborda: boolean;
}
