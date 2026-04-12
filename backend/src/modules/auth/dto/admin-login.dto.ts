import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({
    description: 'Admin login',
    example: 'admin',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  username!: string;

  @ApiProperty({
    description: 'Admin password',
    example: 'super-secure-password',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(256)
  password!: string;
}
