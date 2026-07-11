import { ApiProperty } from '@nestjs/swagger';

import { TaskSuggestionResponseDto } from './task-suggestion-response.dto';

export class TaskSuggestionsResponseDto {
  @ApiProperty({
    description: 'Current-day task suggestions',
    type: [TaskSuggestionResponseDto],
  })
  items!: TaskSuggestionResponseDto[];

  @ApiProperty({
    description: 'Whether current user has already suggested a task today',
    example: false,
  })
  hasSuggestedToday!: boolean;
}
