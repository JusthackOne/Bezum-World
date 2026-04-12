import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginByCodeDto {
  @ApiProperty({
    description: 'Unique 6-character account code (digits and Latin letters)',
    example: 'A1B2C3',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(/^[A-Z0-9]{6}$/, {
    message: 'code must contain exactly 6 alphanumeric characters',
  })
  code!: string;
}
