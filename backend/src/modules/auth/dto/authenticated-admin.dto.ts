import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthenticatedAdminDto {
  @ApiProperty({
    description: 'Admin identifier',
    example: '2df8c39f-3255-4b40-9cb2-7f236c0b62e3',
  })
  id!: string;

  @ApiProperty({
    description: 'Admin login',
    example: 'admin',
  })
  username!: string;

  @ApiPropertyOptional({
    description: 'Time of last successful admin login',
    example: '2026-04-12T15:33:21.412Z',
    nullable: true,
  })
  lastTimeLoggedIn!: string | null;

  @ApiProperty({
    description: 'Admin creation time',
    example: '2026-04-12T12:10:00.000Z',
  })
  createdAt!: string;
}
