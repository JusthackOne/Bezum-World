import { ApiProperty } from '@nestjs/swagger';

import { AuthenticatedUserDto } from '../../auth/dto';

export class AdminUserWithCodeDto extends AuthenticatedUserDto {
  @ApiProperty({
    description: 'Generated 6-character unique auth code for login',
    example: 'H3K91Q',
    nullable: true,
  })
  code!: string | null;
}
