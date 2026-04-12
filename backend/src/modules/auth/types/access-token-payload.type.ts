export interface AccessTokenPayload {
  sub: string;
  username: string;
  actorType: 'user' | 'admin';
}
