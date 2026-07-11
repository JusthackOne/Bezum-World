import { ApiProperty } from '@nestjs/swagger';

export class EventUserDto {
  @ApiProperty({ example: '2ad55bcf-4ee2-4a44-86cd-e62052d51a3f' })
  id!: string;

  @ApiProperty({ example: 'PlayerOne' })
  username!: string;

  @ApiProperty({ example: '/uploads/users/player-one.jpg', nullable: true })
  avatar!: string | null;
}
