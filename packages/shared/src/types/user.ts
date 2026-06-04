export interface User {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  avatar?: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'USER' | 'ADMIN' | 'MODERATOR';

export interface UserCreateInput {
  name: string;
  email: string;
  password: string;
}

export interface UserUpdateInput {
  name?: string;
  email?: string;
  avatar?: string;
}
