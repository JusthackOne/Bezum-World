import type { Request } from 'express';

import type { AccessTokenPayload } from './access-token-payload.type';

export type RequestWithAuthUser = Request & {
  user?: AccessTokenPayload;
};
