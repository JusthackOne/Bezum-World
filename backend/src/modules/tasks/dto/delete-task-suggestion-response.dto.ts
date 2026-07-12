import { ApiProperty } from '@nestjs/swagger';

export class DeleteTaskSuggestionResponseDto {
  @ApiProperty({ description: 'Deleted suggestion identifier' })
  deletedSuggestionId!: string;
}
