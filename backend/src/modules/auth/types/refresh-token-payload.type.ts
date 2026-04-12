export interface RefreshTokenPayload {
  sub: string;
  tokenType: 'refresh';
  actorType: 'user' | 'admin';
}
