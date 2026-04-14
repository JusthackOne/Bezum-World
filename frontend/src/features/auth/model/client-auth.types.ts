export interface ClientLoginByCodePayload {
  code: string;
}

export interface AuthenticatedClientUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  balance: number;
  gameScore: number;
  strength: number;
  charisma: number;
  endurance: number;
  intelligence: number;
  lastTimeLoggedIn: string | null;
  createdAt: string;
}

export interface ClientAuthTokensResponse {
  accessToken: string;
  user: AuthenticatedClientUser;
}
