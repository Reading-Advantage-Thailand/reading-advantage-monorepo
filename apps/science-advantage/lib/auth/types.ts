export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN' | 'SYSTEM';

export interface User {
  id: string;
  name: string | null;
  username: string;
  email: string | null;
  role: UserRole;
  image: string | null;
}

export interface Session {
  id: string;
  token?: string;
  userId: string;
  expiresAt: Date;
  user: User;
}
