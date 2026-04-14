export interface AdminUser {
  id: string;
  username: string;
  code: string | null;
  avatarUrl: string | null;
  balance: number;
  strength: number;
  charisma: number;
  endurance: number;
  intelligence: number;
  lastTimeLoggedIn: string | null;
  createdAt: string;
}

export interface AdminDeleteUserResponse {
  message: string;
  userId: string;
}

export interface AdminCreateUserInput {
  username: string;
  avatarFile?: File | null;
  balance?: number;
  strength: number;
  charisma: number;
  endurance: number;
  intelligence: number;
}

export interface AdminCreateUserResponse {
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
    balance: number;
    strength: number;
    charisma: number;
    endurance: number;
    intelligence: number;
    lastTimeLoggedIn: string | null;
    createdAt: string;
  };
  code: string;
}

export interface AdminUpdateUserInput {
  userId: string;
  username?: string;
  avatarUrl?: string | null;
  avatarFile?: File | null;
  balance?: number;
  strength?: number;
  charisma?: number;
  endurance?: number;
  intelligence?: number;
}

export interface AdminUpdateUserResponse {
  id: string;
  username: string;
  avatarUrl: string | null;
  balance: number;
  strength: number;
  charisma: number;
  endurance: number;
  intelligence: number;
  lastTimeLoggedIn: string | null;
  createdAt: string;
}

export interface UserProfileByUsername {
  username: string;
  lastLoginAt: string | null;
  profilePhoto: string | null;
  balance: number;
  attributes: {
    strength: number;
    charisma: number;
    endurance: number;
    intelligence: number;
  };
}
