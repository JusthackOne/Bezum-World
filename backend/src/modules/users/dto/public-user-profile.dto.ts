import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { PublicUserAttributesDto } from './public-user-attributes.dto';

export class PublicUserProfileDto {
  @ApiProperty({
    description: 'User identifier',
    example: '2df8c39f-3255-4b40-9cb2-7f236c0b62e3',
  })
  id!: string;

  @ApiProperty({
    description: 'Public username',
    example: 'mike123',
  })
  username!: string;

  @ApiPropertyOptional({
    description: 'Time of last successful login',
    example: '2026-04-12T10:00:00.000Z',
    nullable: true,
  })
  lastLoginAt!: string | null;

  @ApiPropertyOptional({
    description: 'Profile photo URL',
    example: 'https://example.com/avatar.jpg',
    nullable: true,
  })
  profilePhoto!: string | null;

  @ApiProperty({
    description: 'Current user balance',
    example: 500,
    minimum: 0,
  })
  balance!: number;

  @ApiProperty({
    description: 'Public user attributes',
    type: PublicUserAttributesDto,
  })
  attributes!: PublicUserAttributesDto;
}
