import { ApiProperty } from '@nestjs/swagger';

import { AuthenticatedUserDto } from './authenticated-user.dto';

export class AuthTokensResponseDto {
  @ApiProperty({
    description: 'JWT access token to be stored on client side',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'Authenticated user profile',
    type: AuthenticatedUserDto,
  })
  user!: AuthenticatedUserDto;
}
