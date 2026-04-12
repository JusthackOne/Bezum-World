import { ApiProperty } from '@nestjs/swagger';

import { AuthenticatedAdminDto } from './authenticated-admin.dto';

export class AdminAuthTokensResponseDto {
  @ApiProperty({
    description: 'JWT access token for admin authorization',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'Authenticated admin profile',
    type: AuthenticatedAdminDto,
  })
  admin!: AuthenticatedAdminDto;
}
