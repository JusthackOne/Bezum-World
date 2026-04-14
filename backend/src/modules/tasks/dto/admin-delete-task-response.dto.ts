import { ApiProperty } from '@nestjs/swagger';

export class AdminDeleteTaskResponseDto {
  @ApiProperty({
    description: 'Deletion result message',
    example: 'Task deleted',
  })
  message!: string;

  @ApiProperty({
    description: 'Deleted task identifier',
    example: '2df8c39f-3255-4b40-9cb2-7f236c0b62e3',
  })
  taskId!: string;
}
