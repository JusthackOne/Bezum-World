import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class GetPublicUserProfileParamsDto {
  @ApiProperty({
    description: 'Public username used to fetch profile data',
    example: 'mike123',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  username!: string;
}
