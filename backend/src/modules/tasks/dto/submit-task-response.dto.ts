import { ApiProperty } from '@nestjs/swagger';

import { TaskSubmissionResponseDto } from './task-submission-response.dto';

export class SubmitTaskUpdatedUserDto {
  @ApiProperty({
    description: 'User balance after rewards',
    example: 650,
  })
  balance!: number;

  @ApiProperty({
    description: 'User total game score after rewards',
    example: 1200,
  })
  gameScore!: number;

  @ApiProperty({
    description: 'User strength after rewards',
    example: 15,
  })
  strength!: number;

  @ApiProperty({
    description: 'User intelligence after rewards',
    example: 11,
  })
  intelligence!: number;

  @ApiProperty({
    description: 'User charisma after rewards',
    example: 17,
  })
  charisma!: number;

  @ApiProperty({
    description: 'User endurance after rewards',
    example: 13,
  })
  endurance!: number;
}

export class SubmitTaskResponseDto {
  @ApiProperty({
    description: 'Created task submission',
    type: TaskSubmissionResponseDto,
  })
  submission!: TaskSubmissionResponseDto;

  @ApiProperty({
    description: 'User state after applying rewards',
    type: SubmitTaskUpdatedUserDto,
  })
  user!: SubmitTaskUpdatedUserDto;
}
