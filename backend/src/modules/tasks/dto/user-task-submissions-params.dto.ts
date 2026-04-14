import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class UserTaskSubmissionsParamsDto {
  @ApiProperty({
    description: 'User identifier',
    example: '2df8c39f-3255-4b40-9cb2-7f236c0b62e3',
  })
  @IsUUID('4')
  userId!: string;
}
