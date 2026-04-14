export interface AdminUser {
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

export interface AdminDeleteUserResponse {
  message: string;
  userId: string;
}
