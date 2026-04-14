import { ApiProperty } from '@nestjs/swagger';

import { TaskSubmissionResponseDto } from './task-submission-response.dto';

export class UserTaskSubmissionsResponseDto {
  @ApiProperty({
    description: 'User task submissions',
    type: TaskSubmissionResponseDto,
    isArray: true,
  })
  submissions!: TaskSubmissionResponseDto[];
}
