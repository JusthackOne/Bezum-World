export interface AdminLoginPayload {
  username: string;
  password: string;
}

export interface AuthenticatedAdmin {
  id: string;
  username: string;
  lastTimeLoggedIn: string | null;
  createdAt: string;
}

export interface AdminAuthTokensResponse {
  accessToken: string;
  admin: AuthenticatedAdmin;
}
