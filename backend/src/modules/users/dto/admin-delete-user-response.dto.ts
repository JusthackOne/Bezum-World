import { ApiProperty } from '@nestjs/swagger';

export class AdminDeleteUserResponseDto {
  @ApiProperty({
    description: 'Deletion status message',
    example: 'User deleted',
  })
  message!: string;

  @ApiProperty({
    description: 'Deleted user id',
    example: '2df8c39f-3255-4b40-9cb2-7f236c0b62e3',
  })
  userId!: string;
}
