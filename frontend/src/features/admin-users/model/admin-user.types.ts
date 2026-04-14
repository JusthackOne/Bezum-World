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
  avatarUrl?: string;
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
