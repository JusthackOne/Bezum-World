import { ApiProperty } from '@nestjs/swagger';

import { AuthenticatedUserDto } from './authenticated-user.dto';

export class AdminCreateAccountResponseDto {
  @ApiProperty({
    description: 'Created account profile',
    type: AuthenticatedUserDto,
  })
  user!: AuthenticatedUserDto;

  @ApiProperty({
    description: 'Generated 6-character unique auth code for login',
    example: 'H3K91Q',
  })
  code!: string;
}
