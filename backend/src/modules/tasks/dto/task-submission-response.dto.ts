import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TaskSubmissionResponseDto {
  @ApiProperty({
    description: 'Task submission identifier',
    example: '40f0e81b-a6e0-4fde-915e-f1a6f9d6c2b4',
  })
  id!: string;

  @ApiProperty({
    description: 'Task identifier',
    example: '2df8c39f-3255-4b40-9cb2-7f236c0b62e3',
  })
  taskId!: string;

  @ApiProperty({
    description: 'User identifier',
    example: '2ad55bcf-4ee2-4a44-86cd-e62052d51a3f',
  })
  userId!: string;

  @ApiPropertyOptional({
    description: 'Proof image URL',
    nullable: true,
    example: 'https://cdn.example.com/proofs/workout-1.png',
  })
  proofImage!: string | null;

  @ApiProperty({
    description: 'Submission creation timestamp',
    example: '2026-04-14T10:22:00.000Z',
  })
  createdAt!: string;
}
