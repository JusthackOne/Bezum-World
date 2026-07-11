import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TaskSuggestionCreatorDto {
  @ApiProperty({
    description: 'User identifier',
    example: '2ad55bcf-4ee2-4a44-86cd-e62052d51a3f',
  })
  id!: string;

  @ApiProperty({
    description: 'Username',
    example: 'neon-scribe',
  })
  username!: string;

  @ApiPropertyOptional({
    description: 'User avatar URL',
    nullable: true,
    example: '/uploads/users/avatar.jpg',
  })
  avatarUrl!: string | null;
}
